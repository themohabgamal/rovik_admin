"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { listOrders, notifyNewOrdersWhatsApp } from "@/app/admin/order-actions";
import { useToast } from "@/components/admin/toast";
import {
  isSoundEnabled,
  loadNewOrderIds,
  loadSeenOrderIds,
  playNewOrderSound,
  saveNewOrderIds,
  saveSeenOrderIds,
  unlockAlertSound,
} from "@/lib/order-alerts";
import type { Order } from "@/lib/orders";

export function OrderWatcher() {
  const { toast } = useToast();
  const [soundOn, setSoundOn] = useState(false);
  const primed = useRef(false);

  const check = useCallback(async () => {
    const { orders, error } = await listOrders();
    if (error) return;
    const ids = orders.map((o) => o.id);
    const seen = loadSeenOrderIds();
    if (!primed.current && seen.size === 0) {
      saveSeenOrderIds(new Set(ids));
      primed.current = true;
      return;
    }
    primed.current = true;
    const incoming = orders.filter((o) => !seen.has(o.id));
    if (incoming.length === 0) return;

    incoming.forEach((o) => seen.add(o.id));
    saveSeenOrderIds(seen);
    const news = loadNewOrderIds();
    incoming.forEach((o) => news.add(o.id));
    saveNewOrderIds(news);
    window.dispatchEvent(new Event("rovik-orders-updated"));

    void notifyNewOrdersWhatsApp(incoming.map((o) => o.id));

    const played = await playNewOrderSound();
    if (!played) setSoundOn(false);
    toast(
      incoming.length === 1
        ? `New order ${incoming[0].orderNumber}`
        : `${incoming.length} new orders`,
      "info"
    );
  }, [toast]);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
    unlockAlertSound();
    void check();
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void check();
    }, 2500);
    const unlock = () => {
      unlockAlertSound();
      setSoundOn(true);
    };
    window.addEventListener("pointerdown", unlock);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pointerdown", unlock);
    };
  }, [check]);

  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <audio src="/sounds/new-order.wav" preload="auto" className="hidden" />
      {soundOn ? (
        <p className="text-xs text-muted">New-order sound is on</p>
      ) : (
        <button
          type="button"
          onClick={async () => {
            const ok = await playNewOrderSound();
            setSoundOn(ok);
          }}
          className="rounded-xl bg-primary px-3 py-2 text-xs font-medium text-white"
        >
          Enable new-order sound
        </button>
      )}
      <Link href="/admin/orders" className="text-xs font-medium text-primary">
        Orders
      </Link>
    </div>
  );
}

export function useLiveOrders(initial: Order[]) {
  const [orders, setOrders] = useState(initial);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const { orders: next, error } = await listOrders();
    if (error) return;
    setOrders(next);
    setNewIds(loadNewOrderIds());
  }, []);

  useEffect(() => {
    setNewIds(loadNewOrderIds());
    const onUpdate = () => void refresh();
    window.addEventListener("rovik-orders-updated", onUpdate);
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    }, 2500);
    return () => {
      window.removeEventListener("rovik-orders-updated", onUpdate);
      window.clearInterval(id);
    };
  }, [refresh]);

  return { orders, newIds, setNewIds, refresh };
}
