export interface ElementManager {
  onDemote(): void;
}

export interface ManagedElement<T extends ElementManager = ElementManager> extends HTMLElement {
  managerObject?: T;
}
