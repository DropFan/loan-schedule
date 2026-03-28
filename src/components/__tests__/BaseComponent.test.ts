import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseComponent } from '../BaseComponent';

class TestComponent extends BaseComponent {
  getContainer(): HTMLElement {
    return this.container;
  }

  query(selector: string): HTMLElement | null {
    return this.$(selector);
  }

  bindEvent<K extends keyof HTMLElementEventMap>(
    selector: string,
    event: K,
    handler: (e: HTMLElementEventMap[K]) => void,
  ): void {
    this.on(selector, event, handler);
  }
}

function setupDOM(): void {
  const app = document.createElement('div');
  app.id = 'app';
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'Click';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Hello';
  app.appendChild(btn);
  app.appendChild(label);
  document.body.appendChild(app);
}

describe('BaseComponent', () => {
  beforeEach(() => {
    document.body.textContent = '';
    setupDOM();
  });

  describe('constructor', () => {
    it('选择器匹配到元素时正常实例化', () => {
      const comp = new TestComponent('#app');
      expect(comp.getContainer()).toBe(document.getElementById('app'));
    });

    it('选择器未匹配到元素时抛出错误', () => {
      expect(() => new TestComponent('#non-existent')).toThrowError(
        'Element not found: #non-existent',
      );
    });
  });

  describe('$(selector)', () => {
    it('查找容器内存在的子元素', () => {
      const comp = new TestComponent('#app');
      const btn = comp.query('.btn');
      expect(btn).not.toBeNull();
      expect(btn!.tagName).toBe('BUTTON');
    });

    it('查找容器内不存在的子元素返回 null', () => {
      const comp = new TestComponent('#app');
      const el = comp.query('.missing');
      expect(el).toBeNull();
    });
  });

  describe('on(selector, event, handler)', () => {
    it('绑定事件到存在的子元素', () => {
      const comp = new TestComponent('#app');
      const handler = vi.fn();
      comp.bindEvent('.btn', 'click', handler);

      const btn = document.querySelector('.btn') as HTMLElement;
      btn.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('选择器未匹配到子元素时不抛出错误', () => {
      const comp = new TestComponent('#app');
      const handler = vi.fn();
      // 不应抛出异常
      comp.bindEvent('.missing', 'click', handler);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
