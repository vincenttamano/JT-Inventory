import { InventoryItem } from '../types';

export interface AlertNotification {
  id: string;
  type: 'low_stock' | 'expiring';
  message: string;
  productName: string;
  severity: 'warning' | 'critical';
}

export function buildInventoryAlerts(inventory: InventoryItem[]): AlertNotification[] {
  const today = new Date();
  const alerts: AlertNotification[] = [];

  inventory.forEach((item) => {
    if (item.quantity <= item.lowStockThreshold) {
      alerts.push({
        id: `low-${item.id}`,
        type: 'low_stock',
        productName: item.productName,
        message: `${item.quantity} ${item.unit} remaining (threshold: ${item.lowStockThreshold})`,
        severity: item.quantity === 0 ? 'critical' : 'warning',
      });
    }

    const expiry = new Date(item.expiryDate);
    const daysLeft = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 60 && daysLeft > 0) {
      alerts.push({
        id: `exp-${item.id}`,
        type: 'expiring',
        productName: item.productName,
        message: `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        severity: daysLeft <= 14 ? 'critical' : 'warning',
      });
    } else if (daysLeft <= 0) {
      alerts.push({
        id: `exp-${item.id}`,
        type: 'expiring',
        productName: item.productName,
        message: `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} ago`,
        severity: 'critical',
      });
    }
  });

  return alerts.sort((a, b) =>
    a.severity === 'critical' && b.severity !== 'critical' ? -1 : 1
  );
}
