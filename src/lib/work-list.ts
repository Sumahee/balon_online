import type { WorkItem } from "@/types";
import { getDrawingAttachment } from "./drawing-attachments";
export function workSummary(item: WorkItem): WorkItem {
  const {description, notes, attachments, comments, materialOrders, ...summary} = item;
  void description; void notes; void attachments; void comments; void materialOrders;
  return {...summary, drawingAttachment:getDrawingAttachment(item), attachments:[], detailsLoaded:false};
}
export const WORK_SUMMARY_COLUMNS = `id, type, title, client_name AS clientName, site_address AS siteAddress,
region, drawing_type AS drawingType, card_type AS cardType, deadline_type AS deadlineType,
delivery_date AS deliveryDate, category, assignee, priority, status, progress, start_date AS startDate,
due_date AS dueDate, created_at AS createdAt, confirmation_pending AS confirmationPending, confirmation_completed AS confirmationCompleted,
work_tags AS tags, calendar_visible AS calendarVisible, post_color AS postColor, board_color AS boardColor`;
