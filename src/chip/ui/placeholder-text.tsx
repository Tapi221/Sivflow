import * as React from "react";
import { cn } from "@/lib/utils";



type PlaceholderTextProps = React.HTMLAttributes<HTMLSpanElement>;



const PlaceholderText = ({ className, ...props }: PlaceholderTextProps) => (<span className={cn("ds-placeholder", className)} {...props} />);



export { PlaceholderText };
