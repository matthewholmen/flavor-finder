// utils/openExternal.ts
//
// Open an external URL in a new tab/sheet. Uses a synthetic anchor click instead of
// window.open: in iOS standalone (home-screen) mode, `window.open(url, '_blank',
// 'noopener')` opens a blank in-app browser sheet (WebKit quirk), while a real anchor
// with target="_blank" behaves correctly — matching how in-page links already work.
export const openExternal = (url: string): void => {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
};
