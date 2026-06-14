import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import { cn } from "@/lib/utils";

const EMOJI_FONT_FAMILY = "var(--emoji-font-family)";

const CalloutElementStatic = ({ children, className, ...props }: SlateElementProps) => {
  const backgroundColor = props.element.backgroundColor as string | undefined;
  const icon = (props.element.icon as string | undefined) ?? "💡";
  return (
    <SlateElement
      className={cn("my-1 flex rounded-sm bg-muted p-4 pl-3", className)}
      style={{ backgroundColor }}
      {...props}
    >
      <div className="flex w-full gap-2 rounded-md">
        <div
          className="size-6 select-none text-lg"
          style={{ fontFamily: EMOJI_FONT_FAMILY }}
        >
          <span data-plate-prevent-deserialization>{icon}</span>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </SlateElement>
  );
};
const CalloutElementDocx = ({ children, ...props }: SlateElementProps) => {
  const backgroundColor = (props.element.backgroundColor as string | undefined) ?? "#f4f4f5";
  const icon = (props.element.icon as string | undefined) ?? "💡";
  return (
    <SlateElement {...props}>
      <table
        style={{
          backgroundColor,
          border: "none",
          borderCollapse: "collapse",
          borderRadius: "4px",
          marginBottom: "4pt",
          marginTop: "4pt",
          width: "100%",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                border: "none",
                fontFamily: EMOJI_FONT_FAMILY,
                fontSize: "18px",
                padding: "8px 4px 8px 8px",
                verticalAlign: "top",
                width: "30px",
              }}
            >
              <span data-plate-prevent-deserialization>{icon}</span>
            </td>
            <td
              style={{
                border: "none",
                padding: "8px 8px 8px 4px",
                verticalAlign: "top",
              }}
            >
              {children}
            </td>
          </tr>
        </tbody>
      </table>
    </SlateElement>
  );
};

export { CalloutElementDocx, CalloutElementStatic };