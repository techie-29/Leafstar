"use client";

import { startTransition, type FormEvent, type FormHTMLAttributes } from "react";

/*
  A <form> that sends its data to a Server Action WITHOUT React's automatic reset afterwards.
  React clears a form after <form action={…}> finishes; on a slow phone that can wipe what the
  person typed while the reply was on its way, or after a refused submit. Here nothing is cleared:
  the fields keep exactly what the person sees. (Forms that should empty after success, like
  "Add brand", keep using <form action> or remount with a new key.)
*/
export function ActionForm({
  action,
  ...rest
}: Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & { action: (formData: FormData) => void }) {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(data));
  };
  return <form onSubmit={onSubmit} {...rest} />;
}
