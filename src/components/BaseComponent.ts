export abstract class BaseComponent {
  protected container: HTMLElement;

  constructor(selector: string) {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`Element not found: ${selector}`);
    this.container = el;
  }

  protected $(selector: string): HTMLElement | null {
    return this.container.querySelector<HTMLElement>(selector);
  }

  protected on<K extends keyof HTMLElementEventMap>(
    selector: string,
    event: K,
    handler: (e: HTMLElementEventMap[K]) => void,
  ): void {
    const el = this.$(selector);
    if (el) el.addEventListener(event, handler);
  }
}
