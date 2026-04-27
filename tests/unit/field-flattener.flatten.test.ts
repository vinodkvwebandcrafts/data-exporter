import { describe as test, it, expect } from 'vitest';
import { describe as fdDescribe, flatten } from '../../server/src/services/field-flattener';
import { allFixtures } from '../fixtures/content-types';

const describeCtx = {
  contentTypes: allFixtures.contentTypes,
  components: allFixtures.components,
  excludeAttributes: ['password'],
  flattenDepth: 3,
};

test('flatten()', () => {
  const descriptors = fdDescribe('api::article.article', describeCtx);
  const flattenCtx = { relationDisplayField: 'id' };

  it('produces a flat row for scalar values', () => {
    const row = flatten(
      { title: 'Hi', views: 5, isPublished: true },
      descriptors,
      flattenCtx,
    );
    expect(row.title).toBe('Hi');
    expect(row.views).toBe(5);
    expect(row.isPublished).toBe(true);
  });

  it('returns null for missing scalar values', () => {
    const row = flatten({ title: 'Hi' }, descriptors, flattenCtx);
    expect(row.views).toBeNull();
  });

  it('walks dotted component paths', () => {
    const row = flatten(
      { address: { city: 'Pune', zip: '411001' } },
      descriptors,
      flattenCtx,
    );
    expect(row['address.city']).toBe('Pune');
    expect(row['address.zip']).toBe('411001');
  });

  it('walks nested component paths', () => {
    const row = flatten(
      { address: { country: { name: 'India', iso: 'IN' } } },
      descriptors,
      flattenCtx,
    );
    expect(row['address.country.name']).toBe('India');
    expect(row['address.country.iso']).toBe('IN');
  });

  it('serializes repeatable components as JSON', () => {
    const row = flatten(
      { comments: [{ text: 'a', rating: 1 }, { text: 'b', rating: 2 }] },
      descriptors,
      flattenCtx,
    );
    expect(JSON.parse(row.comments as string)).toEqual([
      { text: 'a', rating: 1 },
      { text: 'b', rating: 2 },
    ]);
  });

  it('serializes dynamic zones as JSON', () => {
    const row = flatten(
      { blocks: [{ __component: 'shared.hero', title: 'A' }] },
      descriptors,
      flattenCtx,
    );
    expect(JSON.parse(row.blocks as string)).toEqual([
      { __component: 'shared.hero', title: 'A' },
    ]);
  });

  it('emits the URL for media descriptors', () => {
    const row = flatten(
      { cover: { url: '/uploads/cover.jpg' } },
      descriptors,
      flattenCtx,
    );
    expect(row.cover).toBe('/uploads/cover.jpg');
  });

  it('emits null for null media', () => {
    const row = flatten({ cover: null }, descriptors, flattenCtx);
    expect(row.cover).toBeNull();
  });

  it('emits the relationDisplayField for single relation', () => {
    const row = flatten(
      { author: { id: 42, name: 'Jane' } },
      descriptors,
      flattenCtx,
    );
    expect(row.author).toBe(42);
  });

  it('emits a comma-joined list for many-relations', () => {
    const row = flatten(
      { tags: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      descriptors,
      flattenCtx,
    );
    expect(row.tags).toBe('1,2,3');
  });

  it('respects relationDisplayField config', () => {
    const row = flatten(
      { author: { id: 42, name: 'Jane' } },
      descriptors,
      { relationDisplayField: 'name' },
    );
    expect(row.author).toBe('Jane');
  });

  it('serializes JSON-typed scalars', () => {
    const row = flatten(
      { metadata: { foo: 'bar' } },
      descriptors,
      flattenCtx,
    );
    expect(JSON.parse(row.metadata as string)).toEqual({ foo: 'bar' });
  });

  it('formats datetime fields as DD-MM-YYYY', () => {
    const row = flatten(
      { publishedDate: '2026-04-27T14:30:15.000Z' },
      descriptors,
      flattenCtx,
    );
    // The local date for that UTC instant is what shows; check the shape.
    expect(row.publishedDate).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });

  it('formats datetime fields with day/month/year ordering', () => {
    // Pick a date with unambiguous day vs month so we can pin the order.
    const row = flatten(
      // Noon UTC; well clear of timezone date-flip in any timezone.
      { publishedDate: '2026-04-27T12:00:00.000Z' },
      descriptors,
      flattenCtx,
    );
    const [dd, mm, yyyy] = (row.publishedDate as string).split('-');
    expect(dd).toBe('27');
    expect(mm).toBe('04');
    expect(yyyy).toBe('2026');
  });

  it('passes through unparseable date strings rather than NaN-NaN-NaN', () => {
    const row = flatten(
      { publishedDate: 'not-a-date' },
      descriptors,
      flattenCtx,
    );
    expect(row.publishedDate).toBe('not-a-date');
  });
});
