"use client";

import { useState } from "react";
import { Inbox, Phone, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Select, Switch, TextInput, Textarea } from "@/components/ui/Field";
import { Drawer, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { SizeChip, StockBar, Stepper, SwatchRow } from "@/components/ui/Product";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/Badge";

/* Interactive examples for the styleguide. Sample data below is illustrative only. */

export function FieldDemos() {
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <TextInput label="Buyer name" placeholder="e.g. Ramesh Traders" required />
      <TextInput label="Phone" prefix="+91" inputMode="numeric" placeholder="98765 43210" helper="10 digits, no spaces needed" />
      <TextInput label="Instagram handle" prefix="@" placeholder="yourstore" helper="Optional" />
      <TextInput label="Quantity (pieces)" inputMode="numeric" defaultValue="30" error="Minimum order for this article is 50 pieces" />
      <Select
        label="Category"
        placeholder="Choose a category"
        defaultValue=""
        options={[
          { value: "shirt", label: "Shirt" },
          { value: "pant", label: "Pant" },
        ]}
      />
      <TextInput label="Disabled field" defaultValue="LS-SH-0101" disabled />
      <Textarea label="Note" placeholder="Anything we should know about your order" className="md:col-span-2" />
      <div className="flex flex-col md:col-span-2">
        <Checkbox label="Send me a WhatsApp confirmation" defaultChecked />
        <Switch label="Show on website" description="Hidden articles never appear publicly" checked={published} onChange={setPublished} />
        <Switch label="Feature on home page" checked={featured} onChange={setFeatured} />
      </div>
    </div>
  );
}

export function OverlayDemos() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => setModalOpen(true)}>
        Open modal
      </Button>
      <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
        Open drawer
      </Button>
      <Button variant="secondary" onClick={() => toast.show({ kind: "success", title: "Saved", description: "Business details updated." })}>
        Success toast
      </Button>
      <Button variant="secondary" onClick={() => toast.show({ kind: "error", title: "Could not save", description: "Check your connection and try again." })}>
        Error toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.undo({
            title: "60 pieces deducted",
            description: "Bill LS/241 applied.",
            onUndo: () => {
              toast.show({ kind: "info", title: "Undone", description: "Stock is back to where it was." });
            },
          })
        }
      >
        Undo toast (15 s)
      </Button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Request price"
        description="Check Shirt · LS-SH-0101"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Send request</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextInput label="Your name" required />
          <TextInput label="Phone" prefix="+91" required inputMode="numeric" />
          <TextInput label="Instagram handle" prefix="@" helper="Optional" />
        </div>
      </Modal>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Ramesh Traders"
        description="Lead · Request price · 2 hours ago"
        footer={
          <>
            <Button variant="secondary" icon={<Phone aria-hidden="true" className="size-icon" />}>
              Call
            </Button>
            <Button variant="whatsapp">WhatsApp</Button>
          </>
        }
      >
        <p className="type-body text-fg-muted">The lead drawer shows the timeline, notes, follow-up date and the articles the buyer asked about.</p>
      </Drawer>
    </div>
  );
}

export function TabsDemo() {
  const [tab, setTab] = useState("unanswered");
  return (
    <div className="flex flex-col gap-4">
      <Tabs
        label="Inbox"
        value={tab}
        onChange={setTab}
        items={[
          { id: "unanswered", label: "Unanswered", count: 5 },
          { id: "handled", label: "Handled", count: 42 },
          { id: "anonymous", label: "Anonymous", count: 9 },
        ]}
      />
      <TabPanel>
        <p className="type-body text-fg-muted">
          Showing: <span className="font-semibold text-fg">{tab}</span>. Arrow keys move between tabs.
        </p>
      </TabPanel>
    </div>
  );
}

const sampleColours = [
  { name: "Navy", hex: "#1C2B4A" },
  { name: "Sky", hex: "#8FB3D9" },
  { name: "Maroon", hex: "#7A2331" },
  { name: "Olive", hex: "#6B7C45" },
  { name: "Sand", hex: "#CDB894" },
  { name: "White", hex: "#F4F1EA" },
  { name: "Black", hex: "#1B1B1D" },
  { name: "Grey", hex: "#8A8F98" },
  { name: "Mint", hex: "#A9D3C0" },
  { name: "Rust", hex: "#B5451B" },
];

export function ProductDemos() {
  const [colour, setColour] = useState(0);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="type-caption text-fg-muted">SWATCHES (8 SHOWN, +2) · SELECTED: {sampleColours[colour].name.toUpperCase()}</span>
        <SwatchRow colours={sampleColours} selectedIndex={colour} onSelect={setColour} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="type-caption text-fg-muted">SIZES (ADMIN VIEW: XXL UNAVAILABLE)</span>
        <div className="flex flex-wrap gap-2">
          {["S", "M", "L", "XL"].map((s) => (
            <SizeChip key={s} size={s} />
          ))}
          <SizeChip size="XXL" available={false} />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <span className="type-caption text-fg-muted">STOCK BARS (LOW AT 20 PCS)</span>
        <StockBar value={1240} max={2000} lowThreshold={20} />
        <StockBar value={14} max={2000} lowThreshold={20} />
        <StockBar value={0} max={2000} lowThreshold={20} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="type-caption text-fg-muted">STEPPER (ADD STOCK, ON STEP 03)</span>
        <Stepper steps={["Basics", "Colours", "Sizes", "Photos", "Opening stock"]} current={2} />
      </div>
    </div>
  );
}

interface SampleRow {
  code: string;
  name: string;
  brand: string;
  pieces: number;
  status: "inStock" | "lowStock" | "outOfStock";
}

const sampleRows: SampleRow[] = [
  { code: "LS-SH-0101", name: "Check Shirt", brand: "Leaf Star", pieces: 2100, status: "inStock" },
  { code: "LS-PN-0204", name: "Cargo Pant", brand: "Leaf Star", pieces: 18, status: "lowStock" },
  { code: "LS-SH-0107", name: "Oxford Shirt", brand: "Leaf Star", pieces: 0, status: "outOfStock" },
];

const pcs = new Intl.NumberFormat("en-IN");

const columns: Column<SampleRow>[] = [
  { key: "name", header: "Article", primary: true, render: (r) => r.name },
  { key: "code", header: "Code", render: (r) => <span className="type-caption text-gold-text">{r.code}</span> },
  { key: "brand", header: "Brand", render: (r) => r.brand },
  { key: "pieces", header: "Pieces", align: "right", render: (r) => pcs.format(r.pieces) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export function TableDemo() {
  return <DataTable caption="Sample inventory" columns={columns} rows={sampleRows} rowKey={(r) => r.code} empty={null} />;
}

export function StateDemos() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card-surface">
        <EmptyState
          icon={Inbox}
          title="No unanswered contacts"
          description="When a buyer leaves a callback request or asks for a price, it appears here."
          action={<Button icon={<Plus aria-hidden="true" className="size-icon" />}>Add a lead</Button>}
        />
      </div>
      <div className="card-surface">
        <ErrorState description="We couldn't load the inventory. Your data is safe." onRetry={() => undefined} />
      </div>
      <div className="card-surface md:col-span-2">
        <EmptyState icon={Search} title="No articles match" description="Try removing a filter or searching by article code, like LS-SH-0101." />
      </div>
    </div>
  );
}
