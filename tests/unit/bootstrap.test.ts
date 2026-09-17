import { describe as test, it, expect, vi } from 'vitest';
import bootstrap, { getExportableContentTypeUids } from '../../server/src/bootstrap';

const contentTypes = {
  'api::article.article': { uid: 'api::article.article', kind: 'collectionType' },
  'api::homepage.homepage': { uid: 'api::homepage.homepage', kind: 'singleType' },
  'api::secret.secret': {
    uid: 'api::secret.secret',
    kind: 'collectionType',
    pluginOptions: { 'content-manager': { visible: false } },
  },
  'plugin::upload.file': { uid: 'plugin::upload.file', kind: 'collectionType' },
};

function makeStrapiMock({ withContentManager }: { withContentManager: boolean }) {
  const registerMany = vi.fn().mockResolvedValue(undefined);
  const findDisplayedContentTypes = vi.fn(() =>
    Object.values(contentTypes).filter(
      (ct: any) => ct.pluginOptions?.['content-manager']?.visible !== false,
    ),
  );
  return {
    strapi: {
      contentTypes,
      plugin: (name: string) =>
        withContentManager && name === 'content-manager'
          ? { service: () => ({ findDisplayedContentTypes }) }
          : undefined,
      admin: { services: { permission: { actionProvider: { registerMany } } } },
    } as any,
    registerMany,
    findDisplayedContentTypes,
  };
}

test('getExportableContentTypeUids', () => {
  it('uses content-manager displayed content types and keeps only collection types', () => {
    const { strapi, findDisplayedContentTypes } = makeStrapiMock({ withContentManager: true });
    expect(getExportableContentTypeUids(strapi)).toEqual([
      'api::article.article',
      'plugin::upload.file',
    ]);
    expect(findDisplayedContentTypes).toHaveBeenCalled();
  });

  it('falls back to strapi.contentTypes and honours the content-manager visible flag', () => {
    const { strapi } = makeStrapiMock({ withContentManager: false });
    expect(getExportableContentTypeUids(strapi)).toEqual([
      'api::article.article',
      'plugin::upload.file',
    ]);
  });
});

test('bootstrap', () => {
  it('registers the export action with real content-type UIDs as subjects', async () => {
    const { strapi, registerMany } = makeStrapiMock({ withContentManager: true });
    await bootstrap({ strapi });

    expect(registerMany).toHaveBeenCalledTimes(1);
    const [actions] = registerMany.mock.calls[0];
    expect(actions).toEqual([
      expect.objectContaining({
        uid: 'export',
        pluginName: 'data-exporter',
        section: 'contentTypes',
        subjects: ['api::article.article', 'plugin::upload.file'],
      }),
    ]);
    // The old placeholder subject matched no row in the role editor grid.
    expect(actions[0].subjects).not.toContain('plugin::content-manager.contentType');
  });
});
