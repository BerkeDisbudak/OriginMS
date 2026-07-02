import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "./table";

const meta = {
  component: Table,
  title: "UI/Table",
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-mono tabular-nums">REC-1001</TableCell>
          <TableCell>Alpha record</TableCell>
          <TableCell>Ready</TableCell>
        </TableRow>
        <TableRow data-density="compact">
          <TableCell className="font-mono tabular-nums">REC-1002</TableCell>
          <TableCell>Compact row</TableCell>
          <TableCell>Pending</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableEmpty colSpan={1}>No records</TableEmpty>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
