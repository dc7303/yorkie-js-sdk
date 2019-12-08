import { logger } from '../../util/logger';
import { InitialTimeTicket, TimeTicket } from '../time/ticket';
import { JSONElement } from './element';
import { JSONPrimitive } from './primitive';

class RGANode {
  private value: JSONElement;
  private removed: boolean;
  private prev: RGANode;
  private next: RGANode;

  constructor(value: JSONElement) {
    this.value = value;
    this.removed = false;
    this.prev = null;
    this.next = null;
  }

  public static createAfter(prev: RGANode, value: JSONElement): RGANode {
    const newNode = new RGANode(value);
    const prevNext = prev.next;
    prev.next = newNode;
    newNode.prev = prev;
    newNode.next = prevNext;
    if (prevNext) {
      prevNext.prev = newNode;
    }

    return newNode;
  }

  public remove(): void {
    this.removed = true;
  }

  public getCreatedAt(): TimeTicket {
    return this.value.getCreatedAt();
  }

  public getNext(): RGANode {
    return this.next;
  }

  public getValue(): JSONElement {
    return this.value;
  }

  public isRemoved(): boolean {
    return this.removed;
  }
}

export class RGA {
  private first: RGANode;
  private last: RGANode;
  private size: number;
  private nodeMapByCreatedAt: Map<String, RGANode>;

  constructor() {
    this.nodeMapByCreatedAt = new Map();

    const dummyHead = new RGANode(JSONPrimitive.of('', InitialTimeTicket));
    this.nodeMapByCreatedAt.set(dummyHead.getCreatedAt().toIDString(), dummyHead);
    this.first = dummyHead;
    this.last = dummyHead;
  }

  public static create(): RGA {
    return new RGA();
  }

  private findByCreatedAt(prevCreatedAt: TimeTicket, createdAt: TimeTicket): RGANode {
    let node = this.nodeMapByCreatedAt.get(prevCreatedAt.toIDString());
    if (!node) {
      logger.fatal(`cant find the given node: ${prevCreatedAt.toIDString()}`);
    }

    while (node.getNext() && createdAt.after(node.getNext().getCreatedAt())) {
      node = node.getNext();
    }

    return node;
  }

  public insertAfter(prevCreatedAt: TimeTicket, value: JSONElement) {
    const prevNode = this.findByCreatedAt(prevCreatedAt, value.getCreatedAt());
    const newNode = RGANode.createAfter(prevNode, value);
    if (prevNode === this.last) {
      this.last = newNode;
    }

    this.size += 1;
    this.nodeMapByCreatedAt.set(newNode.getCreatedAt().toIDString(), newNode);
  }

  public remove(createdAt: TimeTicket): JSONElement {
    const node = this.nodeMapByCreatedAt.get(createdAt.toIDString());
    node.remove();
    return node.getValue();
  }

  // TODO introduce TreeList: O(n) -> O(log n)
  public removeByIndex(index: number): JSONElement {
    let node = this.first.getNext();
    while(index > 0) {
      if (!node.isRemoved()) {
        index -= 1;
      }
      node = node.getNext();
    }

    node.remove();
    return node.getValue();
  }

  public getLastCreatedAt(): TimeTicket {
    return this.last.getCreatedAt();
  }

  // TODO introduce iterator
  public getElements(): JSONElement[] {
    const elements = [];

    let node = this.first.getNext();
    while(node) {
      if (!node.isRemoved()) {
        elements.push(node.getValue());
      }
      node = node.getNext();
    }

    return elements;
  }

  public toAnnotatedJSON(): string {
    const json = [];

    let node = this.first.getNext();
    while(node) {
      if (node.isRemoved()) {
        json.push(`{${node.getCreatedAt().toIDString()}:${node.getValue().toJSON()}}`);
      } else {
        json.push(`[${node.getCreatedAt().toIDString()}:${node.getValue().toJSON()}]`);
      }
      node = node.getNext();
    }

    return json.join('');
  }
}
