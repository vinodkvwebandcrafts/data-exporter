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
});
