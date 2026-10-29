export type Locale = 'en' | 'pt-BR';

export interface Translations {
  common: {
    copy: string;
    copied: string;
    cancel: string;
    close: string;
    clear: string;
    loading: string;
    error: string;
    success: string;
    status: string;
    active: string;
    all: string;
    delete: string;
    upload: string;
    refresh: string;
    actions: string;
    save: string;
    download: string;
    preview: string;
  };
  breadcrumbs: {
    home: string;
    overview: string;
    console: string;
    snippets: string;
    settings: string;
  };
  sidebar: {
    home: string;
    console: string;
    snippets: string;
    quickSearch: string;
    settings: string;
  };
  navbar: {
    brandSubtitle: string;
    connected: string;
    disconnected: string;
    connecting: string;
    languageTooltip: string;
    themeTooltip: string;
    themeLight: string;
    themeDark: string;
    signOut: string;
  };
  login: {
    title: string;
    subtitle: string;
    passkeyLabel: string;
    passkeyPlaceholder: string;
    submitButton: string;
    submitting: string;
    invalidPasskey: string;
    secureNote: string;
  };
  overview: {
    title: string;
    subtitle: string;
    openConsole: string;
    uploadFile: string;
    viewSnippets: string;
    quickStats: string;
  };
  stats: {
    totalFiles: string;
    storageUsed: string;
    privateFiles: string;
    publicFiles: string;
    foldersCount: string;
    privateFilesCount: (count: number) => string;
    allItemsR2: string;
  };
  console: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    uploadButton: string;
    batchDelete: string;
    batchDeleteConfirm: (count: number) => string;
    noFilesFound: string;
    noFilesMatch: string;
    filterAll: string;
    filterImages: string;
    filterDocs: string;
    filterPrivate: string;
    filterPublic: string;
    deleteSuccess: string;
    deleteError: string;
  };
  uploadModal: {
    title: string;
    dragDropText: string;
    browseText: string;
    folderLabel: string;
    folderPlaceholder: string;
    preserveNameLabel: string;
    privateLabel: string;
    privateHelp: string;
    uploading: string;
    uploadSuccess: string;
    uploadError: string;
  };
  previewModal: {
    title: string;
    fileKey: string;
    fileSize: string;
    mimeType: string;
    uploadedAt: string;
    publicUrl: string;
    signedUrl: string;
    generateSignedUrl: string;
    expiresIn: string;
    copyUrl: string;
  };
  signedModal: {
    title: string;
    subtitle: string;
    durationLabel: string;
    generateButton: string;
    generating: string;
    urlLabel: string;
    expiresLabel: string;
  };
  snippets: {
    title: string;
    subtitle: string;
  };
}
