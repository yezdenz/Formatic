// Content-script work is deliberately limited to reading rendered DOM and
// writing extension storage. This cannot guarantee any third-party telemetry.
export function quizContainer(): Element | null {
  return document.querySelector('#questions, #quiz-submission');
}

export function observeQuiz(container: Element, onChange: () => void): MutationObserver {
  const observer = new MutationObserver(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(onChange, { timeout: 1000 });
    } else {
      setTimeout(onChange, 0);
    }
  });
  observer.observe(container, { childList: true, subtree: true });
  return observer;
}
