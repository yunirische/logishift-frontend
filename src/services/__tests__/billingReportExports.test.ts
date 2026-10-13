import { getTenantBilling } from "../api";

afterEach(() => vi.unstubAllGlobals());

it.each([
  [{ excel: true, photos_zip: false }, { excel: true, photos_zip: false }],
  [undefined, { excel: undefined, photos_zip: undefined }],
  [{ excel: "false", photos_zip: 1 }, { excel: undefined, photos_zip: undefined }],
  [{ excel: false }, { excel: false, photos_zip: undefined }],
])("preserves only explicit server boolean export flags (%s)", async (wire, expected) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, status: 200, headers: new Headers({ "Content-Type": "application/json" }),
    json: async () => ({ current_plan: { code: "company" }, report_exports: wire }),
  }));
  expect((await getTenantBilling()).report_exports).toEqual(expected);
});
