// tests/fixtures/content-types.ts
export const articleContentType = {
  uid: 'api::article.article',
  kind: 'collectionType',
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  attributes: {
    title: { type: 'string' },
    body: { type: 'text' },
    views: { type: 'integer' },
    rating: { type: 'decimal' },
    isPublished: { type: 'boolean' },
    publishedDate: { type: 'datetime' },
    metadata: { type: 'json' },
    status: { type: 'enumeration', enum: ['draft', 'review', 'live'] },
    slug: { type: 'uid', targetField: 'title' },
    password: { type: 'password' },
    cover: { type: 'media', multiple: false, allowedTypes: ['images'] },
    author: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::author.author',
    },
    tags: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::tag.tag',
    },
    address: {
      type: 'component',
      repeatable: false,
      component: 'shared.address',
    },
    comments: {
      type: 'component',
      repeatable: true,
      component: 'shared.comment',
    },
    blocks: {
      type: 'dynamiczone',
      components: ['shared.hero', 'shared.cta'],
    },
  },
} as const;

export const sharedAddress = {
  uid: 'shared.address',
  modelType: 'component',
  attributes: {
    city: { type: 'string' },
    zip: { type: 'string' },
    country: {
      type: 'component',
      repeatable: false,
      component: 'shared.country',
    },
  },
} as const;

export const sharedCountry = {
  uid: 'shared.country',
  modelType: 'component',
  attributes: {
    name: { type: 'string' },
    iso: { type: 'string' },
  },
} as const;

export const sharedComment = {
  uid: 'shared.comment',
  modelType: 'component',
  attributes: {
    text: { type: 'string' },
    rating: { type: 'integer' },
  },
} as const;

export const allFixtures = {
  contentTypes: { 'api::article.article': articleContentType },
  components: {
    'shared.address': sharedAddress,
    'shared.country': sharedCountry,
    'shared.comment': sharedComment,
  },
};
