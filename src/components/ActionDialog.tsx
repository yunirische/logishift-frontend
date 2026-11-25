import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";

type Request = { message: string; action?: string; resolve: (accepted: boolean) => void };

function ActionDialog({ request, close }: { request: Request; close: (accepted: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const dismiss = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const node = ref.current!;
    const previous = document.activeElement;
    if (typeof node.showModal === "function") node.showModal();
    else node.setAttribute("open", "");
    dismiss.current?.focus();
    return () => {
      if (node.open && typeof node.close === "function") node.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <dialog ref={ref} role={request.action ? "alertdialog" : "dialog"} aria-modal="true"
      aria-labelledby={id} onCancel={(event) => { event.preventDefault(); close(false); }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/60">
      <h2 id={id} className="break-words text-base font-bold">{request.message}</h2>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button ref={dismiss} type="button" className="min-h-10 border bg-white text-slate-700" onClick={() => close(false)}>
          {request.action ? "Отмена" : "Понятно"}
        </Button>
        {request.action && <Button type="button" className="min-h-10 bg-[#0a192f] text-white" onClick={() => close(true)}>
          {request.action}
        </Button>}
      </div>
    </dialog>, document.body
  );
}

export function useActionDialog() {
  const [request, setRequest] = useState<Request | null>(null);
  const current = useRef<Request | null>(null);
  useEffect(() => () => current.current?.resolve(false), []);
  const ask = (message: string, action?: string) => new Promise<boolean>((resolve) => {
    current.current?.resolve(false);
    current.current = { message, action, resolve };
    setRequest(current.current);
  });
  const close = (accepted: boolean) => {
    current.current?.resolve(accepted);
    current.current = null;
    setRequest(null);
  };
  return { ask, dialog: request && <ActionDialog request={request} close={close} /> };
}
