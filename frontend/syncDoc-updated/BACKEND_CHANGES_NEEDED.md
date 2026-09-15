# Two small backend changes needed

The frontend is now wired to call your real API instead of using fake/sample
data. Everything works against your existing routes as-is, **except** for two
small gaps — both additive, non-breaking, small edits.

---

## 1. Expand the BlockNode `type` enum

The editor supports 8 block types: `heading`, `paragraph`, `code`, `callout`,
`quote`, `list`, `table`, `divider`. Your backend's `BlockNode` model currently
only allows: `heading`, `paragraph`, `codeBlock`, `list`, `listItem`.

Without this change, creating a `callout`, `quote`, `table`, `divider`, or
`code` block will fail Mongoose enum validation with a 400 error.

In `src/models/BlockNodeModel.ts`:

```typescript
export type BlockType =
  | "heading"
  | "paragraph"
  | "code"
  | "callout"
  | "quote"
  | "list"
  | "listItem"
  | "table"
  | "divider";
```

And update the enum in the schema definition to match:

```typescript
type: {
  type: String,
  required: true,
  enum: ["heading", "paragraph", "code", "callout", "quote", "list", "listItem", "table", "divider"],
},
```

And add entries for the new types in `ALLOWED_PARENTS` (empty array = no
restriction, same as your existing non-list types):

```typescript
const ALLOWED_PARENTS: Record<BlockType, BlockType[]> = {
  heading: [],
  paragraph: [],
  code: [],
  callout: [],
  quote: [],
  list: [],
  listItem: ["list"],
  table: [],
  divider: [],
};
```

(I kept `codeBlock` out — the frontend uses `code` as the type name. If
anything already relies on `codeBlock`, keep both in the enum instead of
renaming.)

---

## 2. Add `GET /api/auth/me`

The frontend needs this so a Google OAuth login can fetch the real
name/email/avatar after the redirect — the JWT payload only contains
`{ userId }`, nothing else.

In `src/routes/authRoutes.ts`, add (uses your existing `protect` middleware
and `UserModel`):

```typescript
router.get("/me", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("Fetch profile error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
});
```

---

## Everything else needs no backend changes

- Signup / login / Google OAuth redirect — used as-is
- Document create / list / get-with-blocks — used as-is
- Block create / update / delete — used as-is (rich block content like list
  items, table rows, formatting is JSON-serialized into the existing `content`
  string field — see `src/models/blockTransform.js` in the frontend for how)

## Known limitations (by design, not bugs)

- **Document rename / delete** — your backend doesn't expose `PATCH`/`DELETE`
  on `/api/documents/:id` yet, so these stay local-only in the UI for now
  (a page refresh will restore the old title / bring back a deleted doc).
- **Block reordering (drag/move)** — no batch-reorder endpoint exists yet, so
  moving a block up/down is local-only and won't survive a refresh.

Both are easy to add later (same pattern as your existing block routes) once
you want them persisted.
