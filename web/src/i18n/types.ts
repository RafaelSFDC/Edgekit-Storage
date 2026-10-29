export type Locale = 'en' | 'pt-BR';

export interface Translations {
  common: {
    confirm: string;
    cancel: string;
    delete: string;
    copied: string;
    copy: string;
    loading: string;
    save: string;
    close: string;
    open: string;
    item: string;
    items: string;
    error: string;
  };
  navbar: {
    brandSubtitle: string;
    refreshTooltip: string;
    clientSnippet: string;
    clientSnippetShort: string;
    apiDocsTooltip: string;
    httpOnlyActive: string;
    logoutTooltip: string;
    connectApiKey: string;
    languageTooltip: string;
  };
  stats: {
    totalFiles: string;
    allItemsR2: string;
    privateFilesCount: (count: number) => string;
    storageUsed: string;
    freeEgress: string;
    folders: string;
    structuredDirs: string;
    cloudflareEdge: string;
    online: string;
    edgeLatency: string;
  };
  upload: {
    dragTitle: string;
    browseDevice: string;
    supportedFormats: string;
    folderPlaceholder: string;
    preserveOriginalName: string;
    privateFile: string;
    queueTitle: (count: number) => string;
    clearQueue: string;
    uploading: string;
    completed: string;
    copyUrl: string;
    copied: string;
    failedUpload: string;
    networkError: string;
  };
  files: {
    searchPlaceholder: string;
    typePlaceholder: string;
    folderPlaceholder: string;
    types: {
      all: string;
      images: string;
      pdf: string;
      private: string;
    };
    folders: {
      all: string;
    };
    gridMode: string;
    tableMode: string;
    selectedCount: (count: number) => string;
    deselectAll: string;
    selectAllVisible: (count: number) => string;
    deleteSelected: string;
    emptyTitle: string;
    emptyFiltered: string;
    emptyInitial: string;
    loadingObjects: string;
    loadMore: string;
    loadingMore: string;
    table: {
      selectAllTitle: string;
      file: string;
      mimeType: string;
      size: string;
      uploadedAt: string;
      actions: string;
      private: string;
    };
    actions: {
      copy: string;
      openFile: string;
      viewDetails: string;
      download: string;
      delete: string;
    };
    deleteModal: {
      title: string;
      description: (key: string) => string;
      cancel: string;
      confirm: string;
    };
    batchDeleteModal: {
      title: string;
      description: (count: number) => string;
      cancel: string;
      confirm: (count: number) => string;
    };
  };
  fileCard: {
    pdfDocument: string;
    privateBadge: string;
    selectTooltip: string;
    copied: string;
    copyUrl: string;
    openNewTab: string;
    moreActions: string;
    viewDetails: string;
    copyDirectLink: string;
    openOrDownload: string;
    deleteFile: string;
    deleteModal: {
      title: string;
      description: (fileName: string) => string;
      cancel: string;
      confirm: string;
    };
  };
  apiKeyModal: {
    titleActive: string;
    titleInactive: string;
    description: string;
    inputLabel: string;
    inputPlaceholder: string;
    emptyError: string;
    invalidError: string;
    connectionError: string;
    securityNotice: string;
    securityNoticeHighlight: string;
    securityNoticeEnd: string;
    cancel: string;
    authenticate: string;
  };
  previewModal: {
    viewFile: string;
    size: string;
    uploadedAt: string;
    idAndMime: string;
    privateTitle: string;
    generateSignedUrl: string;
    regenerateToken: string;
    signedUrlActive: string;
    privateExplainer: string;
    snippetsTitle: string;
    copySnippet: string;
    open: string;
    copySignedUrl: string;
    copyPrivateLink: string;
    copyPublicUrl: string;
    urlCopied: string;
    signedUrlCopied: string;
    tabs: {
      url: string;
      html: string;
      markdown: string;
      nextjs: string;
    };
  };
  snippetModal: {
    title: string;
    subtitle: string;
    tabClient: string;
    tabUsage: string;
    copyCode: string;
    copied: string;
    footerText: string;
    close: string;
  };
  app: {
    bucketFilesHeader: string;
    itemsCount: (count: number) => string;
    configureKeyBtn: string;
    errorLoadFiles: string;
    errorConnection: string;
    errorLoadMore: string;
    errorConnectionMore: string;
    footer: {
      developedFor: string;
      openSource: string;
    };
  };
}
