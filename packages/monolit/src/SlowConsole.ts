export class SlowConsole {
  static async debug(...args: any[]): Promise<void> {
    return new Promise(resolve => {
      console.debug(...args);
      resolve();
    });
  }

  static async dir(arg: any): Promise<void> {
    return new Promise(resolve => {
      console.dir(arg);
      resolve();
    });
  }

  static async info(...args: any[]): Promise<void> {
    return new Promise(resolve => {
      console.info(...args);
      resolve();
    });
  }

  static async warn(...args: any[]): Promise<void> {
    return new Promise(resolve => {
      console.warn(...args);
      resolve();
    });
  }

  static async error(...args: any[]): Promise<void> {
    return new Promise(resolve => {
      console.error(...args);
      resolve();
    });
  }
}
