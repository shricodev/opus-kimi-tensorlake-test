declare module "unzipper" {
  import { Transform } from "stream";

  interface Entry extends Transform {
    path: string;
    type: "Directory" | "File";
    vars: any;
    autodrain(): void;
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
  }

  function Parse(): Transform & {
    on(event: "entry", listener: (entry: Entry) => void): void;
    on(event: "close", listener: () => void): void;
    on(event: "error", listener: (err: Error) => void): void;
  };

  function Extract(options: { path: string }): Transform;
}
