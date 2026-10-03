chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ hubUrl: 'http://localhost:3000' }).then(({ hubUrl }) => {
    chrome.storage.local.set({ hubUrl });
  });
});
