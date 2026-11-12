export const SOCKET_EVENTS = {
  // Public Events
  PRODUCT_CREATED: "product:created",
  PRODUCT_UPDATED: "product:updated",
  PRODUCT_DELETED: "product:deleted",
  INVENTORY_UPDATED: "inventory:updated",
  BANNERS_UPDATED: "banners:updated",
  REVIEW_STATUS_UPDATED: "review:statusUpdated",
  STORY_CREATED: "story:created",
  STORY_UPDATED: "story:updated",
  STORY_DELETED: "story:deleted",

  // Private Customer Events
  ORDER_CREATED: "order:created",
  ORDER_STATUS_UPDATED: "order:statusUpdated",
  ORDER_CANCELLED: "order:cancelled",
  CART_UPDATED: "cart:updated",
  REVIEW_DELETED: "review:deleted",
  USER_UPDATED: "user:updated",

  // Admin Events
  REVIEW_CREATED: "review:created",
  REVIEW_UPDATED: "review:updated",
  LEAD_CREATED: "lead:created",
  LEAD_UPDATED: "lead:updated",
  LEAD_ACTIVITY_ADDED: "lead:activityAdded",
  LEAD_TASK_UPDATED: "lead:taskUpdated",
  LEAD_REMINDER_ADDED: "lead:reminderAdded",
} as const;
