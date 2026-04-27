import { describe as test, it, expect } from 'vitest';
import { describe as fdDescribe } from '../../server/src/services/field-flattener';
import { allFixtures } from '../fixtures/content-types';

const ctx = {
  contentTypes: allFixtures.contentTypes,
  components: allFixtures.components,
  excludeAttributes: ['password', 'resetPasswordToken'],
  flattenDepth: 3,
};

test('describe()', () => {
  it('returns descriptors for scalar attributes', () => {
    const out = fdDescribe('api::article.article', ctx);
    const paths = out.map((d) => d.path);
    expect(paths).toContain('title');
    expect(paths).toContain('views');
    expect(paths).toContain('rating');
    expect(paths).toContain('isPublished');
    expect(paths).toContain('publishedDate');
    expect(paths).toContain('metadata');
    expect(paths).toContain('status');
    expect(paths).toContain('slug');
  });

  it('carries the attribute type through', () => {
    const out = fdDescribe('api::article.article', ctx);
    expect(out.find((d) => d.path === 'views')?.type).toBe('integer');
    expect(out.find((d) => d.path === 'isPublished')?.type).toBe('boolean');
    expect(out.find((d) => d.path === 'publishedDate')?.type).toBe('datetime');
    expect(out.find((d) => d.path === 'metadata')?.type).toBe('json');
    expect(out.find((d) => d.path === 'status')?.type).toBe('enumeration');
  });

  it('excludes password attributes', () => {
    const out = fdDescribe('api::article.article', ctx);
    expect(out.map((d) => d.path)).not.toContain('password');
  });

  it('excludes attributes named in excludeAttributes', () => {
    const out = fdDescribe('api::article.article', {
      ...ctx,
      excludeAttributes: ['title'],
    });
    expect(out.map((d) => d.path)).not.toContain('title');
  });

  it('flattens single components into dotted paths', () => {
    const out = fdDescribe('api::article.article', ctx);
    const paths = out.map((d) => d.path);
    expect(paths).toContain('address.city');
    expect(paths).toContain('address.zip');
  });

  it('recurses through nested single components', () => {
    const out = fdDescribe('api::article.article', ctx);
    const paths = out.map((d) => d.path);
    expect(paths).toContain('address.country.name');
    expect(paths).toContain('address.country.iso');
  });

  it('emits a single JSON descriptor for repeatable components', () => {
    const out = fdDescribe('api::article.article', ctx);
    const comments = out.find((d) => d.path === 'comments');
    expect(comments?.type).toBe('component-repeatable-json');
    expect(out.map((d) => d.path)).not.toContain('comments.text');
  });

  it('emits a single descriptor for media (URL)', () => {
    const out = fdDescribe('api::article.article', ctx);
    const cover = out.find((d) => d.path === 'cover');
    expect(cover?.type).toBe('media-url');
  });

  it('emits a single descriptor for relations', () => {
    const out = fdDescribe('api::article.article', ctx);
    const author = out.find((d) => d.path === 'author');
    expect(author?.type).toBe('relation');
    const tags = out.find((d) => d.path === 'tags');
    expect(tags?.type).toBe('relation');
  });

  it('emits a single JSON descriptor for dynamic zones', () => {
    const out = fdDescribe('api::article.article', ctx);
    const blocks = out.find((d) => d.path === 'blocks');
    expect(blocks?.type).toBe('dynamic-zone-json');
  });

  it('collapses nesting beyond flattenDepth into a JSON descriptor', () => {
    const shallow = fdDescribe('api::article.article', { ...ctx, flattenDepth: 1 });
    const paths = shallow.map((d) => d.path);
    expect(paths).toContain('address.country');
    expect(shallow.find((d) => d.path === 'address.country')?.type).toBe('json');
    expect(paths).not.toContain('address.country.name');
  });

  it('throws on unknown uid', () => {
    expect(() => fdDescribe('api::nope.nope', ctx)).toThrow(/UNKNOWN_UID/);
  });
});
