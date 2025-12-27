/// <reference types="vite/client" />

declare module 'ical.js' {
  export class Property {
    constructor(name: string | any[], parent?: Component);
    setValue(value: any): void;
    setParameter(name: string, value: any): void;
    getParameter(name: string): any;
    getFirstValue(): any;
    name: string;
  }

  export class Component {
    constructor(jcalData: any);
    getFirstSubcomponent(name: string): Component | null;
    addSubcomponent(component: Component): void;
    updatePropertyWithValue(name: string, value: any): void;
    getFirstPropertyValue(name: string): any;
    addProperty(property: Property): void;
    getAllProperties(name?: string): Property[];
    toString(): string;
  }

  export class Time {
    static now(): Time;
    static fromJSDate(date: Date): Time;
    toJSDate(): Date;
  }

  export function parse(icalString: string): any;
}
