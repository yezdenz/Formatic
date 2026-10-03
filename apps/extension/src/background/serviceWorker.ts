chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ hubUrl: 'https://formatic-iota.vercel.app' }).then(({ hubUrl }) => {
    chrome.storage.local.set({ hubUrl });
  });
});
