const cn = (...inputs: Array<string | false | null | undefined>) => inputs.filter((input): input is string => typeof input === "string" && input.length > 0).join(" ");

export { cn };
