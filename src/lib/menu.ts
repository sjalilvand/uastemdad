import { cache } from "react";
import { db } from "./db";

export interface MenuNode {
  id: string;
  label: string;
  url: string;
  order: number;
  children: MenuNode[];
}

/** ساختار درختی منو بر اساس داده‌های پنل ادمین */
export const getMenus = cache(
  async (location: string = "main"): Promise<MenuNode[]> => {
    try {
      const items = await db.menuItem.findMany({
        where: { location, isActive: true },
        orderBy: { order: "asc" },
      });
      const top: MenuNode[] = items
        .filter((i) => !i.parentId)
        .map((i) => ({
          id: i.id,
          label: i.label,
          url: i.url,
          order: i.order,
          children: [],
        }));
      const map = new Map(top.map((t) => [t.id, t]));
      for (const item of items) {
        if (!item.parentId) continue;
        const parent = map.get(item.parentId);
        if (parent) {
          parent.children.push({
            id: item.id,
            label: item.label,
            url: item.url,
            order: item.order,
            children: [],
          });
        }
      }
      top.forEach((t) =>
        t.children.sort((a, b) => a.order - b.order)
      );
      return top;
    } catch {
      return [];
    }
  }
);

export const isExternal = (url: string) =>
  url.startsWith("http://") || url.startsWith("https://");
