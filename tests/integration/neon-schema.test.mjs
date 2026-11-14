import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import test from 'node:test'
import pg from 'pg'

const connectionString = process.env.TEST_DATABASE_URL

function assertSafeTestDatabase(value) {
  if (!value) throw new Error('Set TEST_DATABASE_URL to a disposable local Postgres database.')
  const url = new URL(value)
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const database = decodeURIComponent(url.pathname.slice(1))
  if (!['localhost', '127.0.0.1', 'postgres'].includes(host)) {
    throw new Error('Integration tests only run against localhost or the CI postgres service.')
  }
  if (!/(^|[-_])(ci|test)([-_]|$)/i.test(database)) {
    throw new Error('The TEST_DATABASE_URL database name must include "ci" or "test".')
  }
  return value
}

test('Neon Postgres schema, moderation, and retention integration', async (t) => {
  const client = new pg.Client({ connectionString: assertSafeTestDatabase(connectionString) })
  const suffix = randomUUID().replaceAll('-', '')
  const adminId = `ci-admin-${suffix}`
  const memberId = `ci-member-${suffix}`
  const eventId = `ci-event-${suffix}`
  const groupId = `ci-group-${suffix}`
  const emailSuffix = `${suffix}@ci.example.test`
  const rateLimitKey = createHash('sha256').update(`rate-${suffix}`).digest('hex')
  const limitTestKey = createHash('sha256').update(`limit-${suffix}`).digest('hex')
  const purgeRateLimitKey = createHash('sha256').update(`purge-${suffix}`).digest('hex')
  let suggestionId
  let createdTestUsers = false

  await client.connect()
  try {
    const requiredTables = await client.query(`
      select to_regclass('public.timeline_events') as events,
             to_regclass('public.edit_suggestions') as suggestions,
             to_regclass('auth.user') as users
    `)
    assert.ok(requiredTables.rows[0].events, 'application schema migration has been applied')
    assert.ok(requiredTables.rows[0].suggestions, 'suggestion schema migration has been applied')
    assert.ok(requiredTables.rows[0].users, 'Better Auth migration has been applied')

    await client.query(`
      insert into auth."user" (
        id, name, email, "emailVerified", role, "twoFactorEnabled", "createdAt", "updatedAt"
      ) values
        ($1, 'CI Admin', $2, true, 'admin', true, now(), now()),
        ($3, 'CI Member', $4, true, 'user', false, now(), now())
    `, [adminId, `admin-${emailSuffix}`, memberId, `member-${emailSuffix}`])
    createdTestUsers = true

    await t.test('loads the seeded public timeline and event relationships', async () => {
      const { rows: traditions } = await client.query('select count(*)::integer as count from public.traditions')
      const { rows: events } = await client.query('select count(*)::integer as count from public.timeline_events')
      const { rows: groups } = await client.query('select count(*)::integer as count from public.timeline_groups')
      const { rows: parents } = await client.query('select count(*)::integer as count from public.event_parents')
      const pentecost = await client.query("select id from public.timeline_events where id = 'pentecost'")

      assert.equal(traditions[0].count, 17)
      assert.ok(events[0].count >= 50)
      assert.ok(groups[0].count > 0)
      assert.ok(parents[0].count > 0)
      assert.equal(pentecost.rowCount, 1)
    })

    await t.test('rejects non-curators and allows TOTP-enabled curator mutations', async () => {
      const group = {
        id: groupId,
        title: 'CI test group',
        date_label: '2026',
        start_year: 2026,
        end_year: 2026,
        auto_expand_zoom: 1.35,
      }
      await assert.rejects(
        client.query('select public.save_timeline_group($1, $2::jsonb)', [memberId, JSON.stringify(group)]),
        (error) => error.code === '42501' && error.message.includes('curator_access_required'),
      )
      await client.query('select public.save_timeline_group($1, $2::jsonb)', [adminId, JSON.stringify(group)])

      const event = {
        id: eventId,
        year: 2026,
        date_label: '2026',
        title: 'CI integration event',
        tradition_id: 'undivided',
        kind: 'event',
        icon: { type: 'lucide', name: 'Anchor' },
        summary: 'Original summary.',
        detail: 'Original description.',
        key_figures: ['CI curator'],
        links: [],
        group_id: groupId,
      }
      await client.query('select public.save_timeline_event($1, $2::jsonb, $3::text[])', [
        adminId,
        JSON.stringify(event),
        ['pentecost'],
      ])
      await client.query('select public.save_timeline_event($1, $2::jsonb, $3::text[])', [
        adminId,
        JSON.stringify({ ...event, title: 'Updated CI integration event' }),
        ['pentecost'],
      ])

      const { rows } = await client.query(`
        select e.title, e.created_by, e.updated_by, e.group_id, ep.parent_id
        from public.timeline_events e
        join public.event_parents ep on ep.event_id = e.id
        where e.id = $1
      `, [eventId])
      assert.equal(rows.length, 1)
      assert.equal(rows[0].title, 'Updated CI integration event')
      assert.equal(rows[0].created_by, adminId)
      assert.equal(rows[0].updated_by, adminId)
      assert.equal(rows[0].group_id, groupId)
      assert.equal(rows[0].parent_id, 'pentecost')
    })

    await t.test('submits and approves suggestions, enforces durable rate limits, and purges expired records', async () => {
      const { rows } = await client.query(`
        select public.submit_edit_suggestion(
          $1::jsonb,
          $2::jsonb,
          $3
        ) as id
      `, [
        JSON.stringify({
          event_id: eventId,
          contributor: 'CI reviewer',
          note: 'Check the integration workflow.',
          source: { label: 'CI source', url: 'https://ci.example.test/source' },
        }),
        JSON.stringify([{ field: 'summary', after: 'Reviewed summary.' }]),
        rateLimitKey,
      ])
      suggestionId = rows[0].id

      await client.query('select public.review_edit_suggestion($1, $2::uuid, $3)', [
        adminId,
        suggestionId,
        'approved',
      ])
      const approved = await client.query(`
        select s.status, e.summary, e.links
        from public.edit_suggestions s
        join public.timeline_events e on e.id = s.event_id
        where s.id = $1
      `, [suggestionId])
      assert.equal(approved.rows[0].status, 'approved')
      assert.equal(approved.rows[0].summary, 'Reviewed summary.')
      assert.ok(approved.rows[0].links.some((link) => link.url === 'https://ci.example.test/source'))

      for (let index = 0; index < 20; index += 1) {
        await client.query(`
          select public.submit_edit_suggestion($1::jsonb, $2::jsonb, $3)
        `, [
          JSON.stringify({
            event_id: eventId,
            contributor: 'CI rate-limit test',
            note: `Rate-limit submission ${index}`,
            source: null,
          }),
          JSON.stringify([{ field: 'detail', after: `Rate-limit detail ${index}` }]),
          limitTestKey,
        ])
      }
      await assert.rejects(
        client.query(`
          select public.submit_edit_suggestion($1::jsonb, $2::jsonb, $3)
        `, [
          JSON.stringify({
            event_id: eventId,
            contributor: 'CI rate-limit test',
            note: 'This request should be denied.',
            source: null,
          }),
          JSON.stringify([{ field: 'detail', after: 'Rate-limit detail 21' }]),
          limitTestKey,
        ]),
        /suggestion_rate_limit_exceeded/,
      )
      const limit = await client.query(
        'select request_count from public.suggestion_rate_limits where rate_limit_key = $1',
        [limitTestKey],
      )
      assert.equal(limit.rows[0].request_count, 20)

      await client.query(
        "update public.edit_suggestions set reviewed_at = now() - interval '2 years' where id = $1",
        [suggestionId],
      )
      await client.query(`
        insert into public.suggestion_rate_limits(rate_limit_key, window_started_at, request_count, updated_at)
        values ($1, now() - interval '49 hours', 1, now() - interval '49 hours')
      `, [purgeRateLimitKey])
      await client.query('select public.purge_expired_suggestion_data()')

      const expiredSuggestion = await client.query('select 1 from public.edit_suggestions where id = $1', [suggestionId])
      const expiredLimit = await client.query(
        'select 1 from public.suggestion_rate_limits where rate_limit_key = $1',
        [purgeRateLimitKey],
      )
      assert.equal(expiredSuggestion.rowCount, 0)
      assert.equal(expiredLimit.rowCount, 0)
    })
  } finally {
    try {
      if (createdTestUsers) {
        await client.query('delete from public.edit_suggestions where event_id = $1 or reviewed_by = $2', [eventId, adminId])
        await client.query('delete from public.suggestion_rate_limits where rate_limit_key = any($1::text[])', [
          [rateLimitKey, limitTestKey, purgeRateLimitKey],
        ])
        await client.query('delete from public.timeline_events where id = $1', [eventId])
        await client.query('delete from public.timeline_groups where id = $1', [groupId])
        await client.query('delete from auth."user" where id = any($1::text[])', [[adminId, memberId]])
      }
    } finally {
      await client.end()
    }
  }
})
