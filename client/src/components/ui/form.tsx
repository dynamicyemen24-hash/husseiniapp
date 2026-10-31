import * as React from "react";
import {
  FormProvider,
  useController,
  useFormContext,
  UseFormReturn,
  FieldPath,
  FieldValues,
  ControllerRenderProps,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "./label";
import { Input } from "./input";

const FormFieldNameContext = React.createContext<string | undefined>(undefined);

function getPath(obj: unknown, path: string): any {
  return path
    .split(".")
    .reduce<any>(
      (acc, key) =>
        acc != null && typeof acc === "object" ? acc[key] : undefined,
      obj
    );
}

function Form<TFieldValues extends FieldValues>({
  children,
  ...props
}: UseFormReturn<TFieldValues> & { children: React.ReactNode }) {
  return <FormProvider {...props}>{children}</FormProvider>;
}

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  render,
}: {
  control: UseFormReturn<TFieldValues>["control"];
  name: TName;
  render: ({
    field,
  }: {
    field: ControllerRenderProps<TFieldValues, TName>;
  }) => React.ReactElement;
}) {
  const { field } = useController<TFieldValues, TName>({ name, control });
  return (
    <FormFieldNameContext.Provider value={name as string}>
      {render({ field })}
    </FormFieldNameContext.Provider>
  );
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-1.5", className)} {...props} />;
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return <Label className={cn("text-xs font-medium", className)} {...props} />;
}

function FormControl({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("", className)} {...props} />;
}

function FormMessageInner({
  fieldName,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { fieldName?: string }) {
  const { formState } = useFormContext();
  const err = fieldName ? getPath(formState.errors, fieldName) : undefined;
  const message = (err as { message?: unknown } | undefined)?.message;
  const contextError = typeof message === "string" ? message : undefined;
  const content = children ?? contextError;
  if (!content) return null;
  return (
    <div
      role="alert"
      className={cn("text-xs text-destructive", className)}
      {...props}
    >
      {content}
    </div>
  );
}

function FormMessage(props: React.ComponentProps<"div">) {
  const fieldName = React.useContext(FormFieldNameContext);
  return <FormMessageInner fieldName={fieldName} {...props} />;
}

export { Form, FormField, FormItem, FormLabel, FormControl, FormMessage };
