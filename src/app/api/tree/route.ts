import { NextRequest, NextResponse } from "next/server";
import { buildTree } from "@/lib/storage/tree-builder";
import { ensureDataDir } from "@/lib/storage/fs-operations";
import { getRequestUser } from "@/lib/auth/request-user";
import type { TreeNode } from "@/types";

function filterPrivateNodes(nodes: TreeNode[], username: string | null, isAdmin: boolean): TreeNode[] {
  return nodes.reduce<TreeNode[]>((acc, node) => {
    // Hide private pages from non-owners (admins can see everything)
    if (node.frontmatter?.visibility === "private" && !isAdmin && node.frontmatter?.owner !== username) {
      return acc;
    }
    const filtered = { ...node };
    if (filtered.children) {
      filtered.children = filterPrivateNodes(filtered.children, username, isAdmin);
    }
    acc.push(filtered);
    return acc;
  }, []);
}

export async function GET(request: NextRequest) {
  try {
    await ensureDataDir();
    const showHidden = request.nextUrl.searchParams.get("showHidden") === "1";
    const tree = await buildTree(showHidden);

    // Filter private pages based on current user
    const user = getRequestUser(request);
    const filtered = filterPrivateNodes(tree, user?.username ?? null, user?.role === "admin");

    return NextResponse.json(filtered);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
