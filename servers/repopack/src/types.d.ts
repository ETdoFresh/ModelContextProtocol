declare module 'strip-comments' {
    interface StripOptions {
        language?: string;
        preserveNewlines?: boolean;
    }
    function strip(input: string, options?: StripOptions): string;
    export = strip;
} 