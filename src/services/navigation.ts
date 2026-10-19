export const replaceLocation = (url: string): void => {
  window.location.replace(url);
};

export const assignLocation = (url: string): void => {
  window.location.href = url;
};
