import { NextRequest, NextResponse } from "next/server";
import { buildTree } from "@/lib/storage/tree-builder";
import { ensureDataDir } from "@/lib/storage/fs-operations";
import { canReadPageForRequest } from "@/lib/auth/route-guards";
import { getRequestUser } from "@/lib/auth/request-user";
import type { TreeNode } from "@/types";

async function filterReadableNodes(req: NextRequest, nodes: TreeNode[]): Promise<TreeNode[]> {
  const filteredNodes: TreeNode[] = [];

  for (const node of nodes) {
    const filtered = { ...node };
    if (filtered.children) {
      filtered.children = await filterReadableNodes(req, filtered.children);
    }

    const canRead = await canReadPageForRequest(req, node.path).catch(() => false);
    if (canRead || (filtered.children && filtered.children.length > 0)) {
      filteredNodes.push(filtered);
    }
  }

  return filteredNodes;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDataDir();
    const showHidden = request.nextUrl.searchParams.get("showHidden") === "1";
    const tree = await buildTree(showHidden);
    const actor = getRequestUser(request);

    if (actor?.role === "admin" || actor?.systemRole === "platform_admin") {
      return NextResponse.json(tree);
    }

    const filtered = await filterReadableNodes(request, tree);

    return NextResponse.json(filtered);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
