import React, { useState, useEffect, useMemo, useRef } from "react";
import { API_ENDPOINTS, API_BASE_URL } from "../constants";
import api, { getPhotoUrl } from "../services/api";
import { Shift } from "../types";
import {
  toTenantISO,
  fromTenantISO,
  nowInTenantTimezone,
  compareTenantLocalDateTimes,
  getBrowserTimezone,
} from "../utils/dateUtils";
import { useFocusTrap, useFocusRestore } from "../hooks/useFocusTrap";
import { AlertCircle, MessageSquare, Send, X, Lock, Upload, Check, Image, Pencil, Trash2, ArrowRightLeft, FileText } from "lucide-react";
import { getUserInfo } from "../services/api";

interface Comment {
  id: number;
  text: string;
  author: string;
  author_role?: string; // Role tag (admin/driver/foreman) for Technical Header
  created_at: string;
  reply_to?: number; // For @mentions - ID of comment being replied to
  mentions?: string[]; // Array of mentioned usernames
}

interface EditShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    updatedShift?: Partial<Shift>,
    options?: { refreshList?: boolean }
  ) => void;
  shift: Shift;
  timezone: string;
  timezoneLoaded: boolean;
}

const EditShiftModal: React.FC<EditShiftModalProps> = ({
  isOpen,
  onClose,
  onSave,
  shift,
  timezone,
  timezoneLoaded,
}) => {
  const containerRef = useFocusTrap(isOpen);
  useFocusRestore(isOpen);
  const previousShiftIdRef = useRef<number | null>(null);

  // Get current user role
  const currentUser = getUserInfo();
  const isAdmin = currentUser?.role === 'admin';
  const effectiveTimezone = timezone || "Europe/Moscow";

  // Time fields
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [tenantNow, setTenantNow] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'comments'>('details');

  // Comments (chat style)
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [bypassReason, setBypassReason] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [showCommentsSkeleton, setShowCommentsSkeleton] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showAuditSkeleton, setShowAuditSkeleton] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [overlapError, setOverlapError] = useState(false);
  const [uploadingPhotoType, setUploadingPhotoType] = useState<string | null>(null);
  const [modalShift, setModalShift] = useState<Shift>(shift);
  const [tenantSettings, setTenantSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [showSettingsSkeleton, setShowSettingsSkeleton] = useState(false);
  const currentShift = modalShift || shift;

  // Pre-fill time fields when modal opens or when a different shift is selected.
  useEffect(() => {
    if (isOpen && shift) {
      const openedDifferentShift = previousShiftIdRef.current !== shift.id;
      previousShiftIdRef.current = shift.id;
      setModalShift((prev) =>
        openedDifferentShift ? shift : ({ ...prev, ...shift } as Shift)
      );

      // Convert backend times to datetime-local format
      setStartTime(
        shift.start_time ? fromTenantISO(shift.start_time, effectiveTimezone) : ""
      );
      setEndTime(
        shift.end_time ? fromTenantISO(shift.end_time, effectiveTimezone) : ""
      );

      // Load tenant settings for invoice requirement
      loadTenantSettings();

      if (openedDifferentShift) {
        setActiveTab('details');
        setNewComment("");
        setBypassReason("");
        setAuditLogs([]);
        setAuditError(null);
        setComments([]);
        setCommentsError(null);
        setError(null);
        setSuccessMessage(null);
        setOverlapError(false);
      }
    }
  }, [isOpen, shift, effectiveTimezone]);

  useEffect(() => {
    if (!isOpen) {
      previousShiftIdRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !timezoneLoaded) {
      setTenantNow("");
      return;
    }

    const updateTenantNow = () => setTenantNow(nowInTenantTimezone(effectiveTimezone));
    updateTenantNow();

    const intervalId = window.setInterval(updateTenantNow, 30000);
    return () => window.clearInterval(intervalId);
  }, [isOpen, timezoneLoaded, effectiveTimezone]);

  // Load audit logs when History tab becomes active (lazy loading)
  useEffect(() => {
    if (activeTab === 'history' && auditLogs.length === 0 && !loadingAudit) {
      loadAuditLogs();
    }
  }, [activeTab]);

  // Load comments when Comments tab becomes active (lazy loading)
  useEffect(() => {
    if (activeTab === 'comments' && comments.length === 0 && !loadingComments) {
      loadComments();
    }
  }, [activeTab]);

  // Load audit logs when History tab becomes active (lazy loading)
  useEffect(() => {
    if (activeTab === 'history' && auditLogs.length === 0 && !loadingAudit) {
      loadAuditLogs();
    }
  }, [activeTab]);

  const parseShiftCommentString = (commentValue?: string | null): Comment[] => {
    if (!commentValue || commentValue.trim() === "") {
      return [];
    }

    const currentYear = new Date().getFullYear();
    return commentValue
      .split('\n')
      .map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        const match = trimmed.match(/^\[(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})\s+([^\]]+)\]:\s*(.*)$/s);
        if (!match) {
          return {
            id: index + 1,
            text: trimmed,
            author: 'Система',
            created_at: new Date().toISOString(),
          };
        }

        const [, day, month, hour, minute, role, text] = match;
        const createdAt = new Date(
          currentYear,
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute)
        );
        const normalizedRole = role.toLowerCase();

        return {
          id: index + 1,
          text,
          author: role,
          author_role: normalizedRole.includes('admin')
            ? 'admin'
            : normalizedRole.includes('driver')
              ? 'driver'
              : normalizedRole,
          created_at: Number.isNaN(createdAt.getTime()) ? new Date().toISOString() : createdAt.toISOString(),
        };
      })
      .filter((comment): comment is Comment => Boolean(comment));
  };

  // Load comment history using GET /shifts/:id endpoint with tab-specific loading
  const loadComments = async () => {
    setLoadingComments(true);
    setCommentsError(null);
    setShowCommentsSkeleton(false);

    // Show skeleton after 200ms delay
    const skeletonTimer = setTimeout(() => {
      if (loadingComments) {
        setShowCommentsSkeleton(true);
      }
    }, 200);

    try {
      // Use endpoint to fetch full shift details with comments
      const data = await api.get(API_ENDPOINTS.GET_SHIFT(shift.id));

      // Normalize API response to Comment interface
      let normalizedComments: Comment[] = [];
      if (data && data.comments && Array.isArray(data.comments)) {
        normalizedComments = data.comments.map((c: any) => ({
          id: c.id,
          text: c.text || c.comment || '',
          author: c.author || c.user || c.user_name || 'Неизвестно',
          author_role: c.author_role || c.user_role || c.role || undefined,
          created_at: c.created_at || c.timestamp || new Date().toISOString(),
          reply_to: c.reply_to || c.in_reply_to || undefined,
          mentions: c.mentions || undefined,
        }));
        setComments(normalizedComments);
      } else if (typeof data?.comment === 'string') {
        setComments(parseShiftCommentString(data.comment));
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Failed to load shift comments:", err);
      setCommentsError("Ошибка загрузки комментариев");
      setComments([]);
    } finally {
      clearTimeout(skeletonTimer);
      setLoadingComments(false);
      setShowCommentsSkeleton(false);
    }
  };


  // Load tenant settings for invoice requirement
  const loadTenantSettings = async () => {
    setLoadingSettings(true);
    setShowSettingsSkeleton(false);

    // Start 200ms delay for skeleton
    const skeletonTimer = setTimeout(() => {
      if (loadingSettings) {
        setShowSettingsSkeleton(true);
      }
    }, 200);

    try {
      const data = await api.get(API_ENDPOINTS.TENANT_SETTINGS);
      setTenantSettings(data);
    } catch (err) {
      console.error("Failed to load tenant settings:", err);
      setTenantSettings(null);
    } finally {
      clearTimeout(skeletonTimer);
      setLoadingSettings(false);
      setShowSettingsSkeleton(false);
    }
  };

  // Load audit logs for this shift
  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    setAuditError(null);
    setShowAuditSkeleton(false);

    // Show skeleton after 200ms delay
    const skeletonTimer = setTimeout(() => {
      if (loadingAudit) {
        setShowAuditSkeleton(true);
      }
    }, 200);

    try {
      const data = await api.get(API_ENDPOINTS.AUDIT_SHIFT(shift.id));
      if (Array.isArray(data)) {
        setAuditLogs(data);
      } else if (data?.logs && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setAuditError("Ошибка загрузки истории");
      setAuditLogs([]);
    } finally {
      clearTimeout(skeletonTimer);
      setLoadingAudit(false);
      setShowAuditSkeleton(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setOverlapError(false);

    try {
      // Check what fields changed
      const originalStart = shift.start_time ? fromTenantISO(shift.start_time, effectiveTimezone) : "";
      const originalEnd = shift.end_time ? fromTenantISO(shift.end_time, effectiveTimezone) : "";
      const timeChanged = startTime !== originalStart || endTime !== originalEnd;
      const commentChanged = newComment.trim().length > 0;

      // Determine if this is a comment-only update
      const isCommentOnly = commentChanged && !timeChanged;

      // COMMENT-ONLY UPDATE: use the dedicated backend comment endpoint.
      if (isCommentOnly) {
        const response = await api.post(API_ENDPOINTS.ADD_SHIFT_COMMENT(shift.id), {
          text: newComment.trim(),
        });
        if (typeof response?.comment === 'string') {
          setComments(parseShiftCommentString(response.comment));
        } else {
          await loadComments();
        }
        setNewComment("");
        setSuccessMessage("Комментарий добавлен");
        return;
      }

      const payload: any = {};

      // v1.1.2: Comment-only updates are allowed for ANY shift status
      // Time changes require admin role and can't be done on finished shifts
      if (timeChanged) {
        // Time changes: need admin + active shift
        if (!isAdmin) {
          setError("⚠️ Только администратор может изменять время смены");
          setLoading(false);
          return;
        }

        if (!timezoneLoaded) {
          setError("⚠️ Часовой пояс компании еще загружается. Повторите сохранение через несколько секунд.");
          setLoading(false);
          return;
        }

        if (shift.status === 'finished') {
          setError("⚠️ Нельзя изменить время завершенной смены. Используйте только поле комментария.");
          setLoading(false);
          return;
        }

        const freshTenantNow = nowInTenantTimezone(effectiveTimezone);
        const endComparedToStart = compareTenantLocalDateTimes(endTime, startTime);
        const endComparedToNow = compareTenantLocalDateTimes(endTime, freshTenantNow);

        if (startTime && endTime && endComparedToStart !== null && endComparedToStart <= 0) {
          setError("⚠️ Время окончания должно быть позже начала");
          setLoading(false);
          return;
        }

        if (endTime && endComparedToNow !== null && endComparedToNow > 0) {
          setError(`⚠️ Время окончания не может быть позже текущего времени компании (${effectiveTimezone})`);
          setLoading(false);
          return;
        }

        // Send time fields
        if (startTime !== originalStart) {
          payload.start_time = startTime;
        }

        if (endTime !== originalEnd) {
          payload.end_time = endTime;
        }

        payload.tenant_timezone = effectiveTimezone;
      }

      // Append comment if provided (for time+comment updates)
      if (needsBypassReasonForSubmit) {
        if (bypassReason.trim().length === 0) {
          setError(`В смене отсутствуют обязательные подтверждения: ${proofState.missingRequiredLabels.join(", ")}. Укажите причину закрытия без обязательных фото.`);
          setLoading(false);
          return;
        }

        payload.comment = bypassReason.trim();
      } else if (commentChanged) {
        payload.comment = newComment.trim();
      }

      const response = await api.patch(API_ENDPOINTS.UPDATE_SHIFT(shift.id), payload);
      if (needsBypassReasonForSubmit) {
        setBypassReason("");
      } else if (commentChanged) {
        setNewComment("");
        if (activeTab === 'comments') {
          await loadComments();
        }
      }
      setSuccessMessage("Изменения сохранены");
      onSave(response?.shift);
    } catch (err: any) {
      console.error("Update shift error:", err);

      // Check for overlap error (400 status with specific message)
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.response?.data?.detail || err?.message || "";
      const errorCode = err?.response?.data?.error_code || err?.response?.data?.error;

      // v1.1.2: Check for new error messages
      if (message.includes("Смена уже завершена") || message.includes("только поле comment")) {
        setError("⚠️ " + message);
        return;
      }

      if (message.includes("Водитель может добавлять комментарии только к своим сменам")) {
        setError("⚠️ " + message);
        return;
      }

      // Check for various overlap error formats
      const isOverlap =
        status === 400 &&
        (message.toLowerCase().includes("overlap") ||
          message.toLowerCase().includes("занят") ||
          message.toLowerCase().includes("уже") ||
          errorCode === "OVERLAP" ||
          errorCode === "SHIFT_OVERLAP" ||
          message.includes("машина") ||
          message.includes("водител"));

      if (isOverlap) {
        setOverlapError(true);
          setError(
          "⚠️ Эта машина или водитель уже заняты в указанный период"
        );
      } else {
        // Extract backend error message
        setError(message || "Failed to update shift");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !loading) {
      onClose();
    }
  };

  const refreshCurrentShift = async () => {
    const refreshedShift = await api.get(API_ENDPOINTS.GET_SHIFT(currentShift.id));
    setModalShift(refreshedShift);
    setStartTime(
      refreshedShift.start_time
        ? fromTenantISO(refreshedShift.start_time, effectiveTimezone)
        : ""
    );
    setEndTime(
      refreshedShift.end_time
        ? fromTenantISO(refreshedShift.end_time, effectiveTimezone)
        : ""
    );
    return refreshedShift as Shift;
  };

  useEffect(() => {
    if (!isOpen || !shift?.id) {
      return;
    }

    let cancelled = false;

    const loadFullShift = async () => {
      try {
        const fullShift = await api.get(API_ENDPOINTS.GET_SHIFT(shift.id));
        if (cancelled) return;
        setModalShift(fullShift);
        setStartTime(
          fullShift.start_time
            ? fromTenantISO(fullShift.start_time, effectiveTimezone)
            : ""
        );
        setEndTime(
          fullShift.end_time
            ? fromTenantISO(fullShift.end_time, effectiveTimezone)
            : ""
        );
      } catch (err) {
        console.error("Failed to load full shift details:", err);
      }
    };

    loadFullShift();

    return () => {
      cancelled = true;
    };
  }, [isOpen, shift?.id, effectiveTimezone]);

  // Handle photo upload - use proxy endpoint for admin photo uploads
  const handlePhotoUpload = async (photoType: 'start' | 'end' | 'invoice', file: File) => {
    setUploadingPhotoType(photoType);
    setError(null);
    setSuccessMessage(null);

    try {
      // Map photo type to API format
      const typeMap: Record<string, string> = {
        'start': 'odo_start',
        'end': 'odo_end',
        'invoice': 'invoice',
      };

      const formData = new FormData();
      formData.append('photo', file);
      formData.append('type', typeMap[photoType]); // API expects 'type' not 'photo_type'

      // Use proxy endpoint: /api/v1/shifts/:id/proxy-photo
      const response = await fetch(`${API_BASE_URL}/shifts/${currentShift.id}/proxy-photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${api.getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Ошибка загрузки фото');
      }

      const refreshedShift = await refreshCurrentShift();
      onSave(refreshedShift, { refreshList: false });
      setSuccessMessage('Фото успешно загружено');
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки фото');
    } finally {
      setUploadingPhotoType(null);
    }
  };

  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const browserTimezoneDiffers =
    timezoneLoaded && browserTimezone && browserTimezone !== effectiveTimezone;
  const endTimeMin = startTime || undefined;
  const endTimeMax = tenantNow || undefined;

  // Validate tenant-local datetime-local values without browser timezone conversion.
  const isEndTimeBeforeStart = startTime && endTime
    ? compareTenantLocalDateTimes(endTime, startTime) !== null &&
      compareTenantLocalDateTimes(endTime, startTime)! <= 0
    : false;
  const isEndTimeAfterTenantNow = endTime && tenantNow
    ? compareTenantLocalDateTimes(endTime, tenantNow) !== null &&
      compareTenantLocalDateTimes(endTime, tenantNow)! > 0
    : false;
  const isEndTimeInvalid = Boolean(isEndTimeBeforeStart || isEndTimeAfterTenantNow);

  // Validate: check if year is valid (4 digits, reasonable range)
  const isValidYear = (dateString: string) => {
    if (!dateString) return true;
    const match = dateString.match(/^(\d{4})-/);
    if (!match) return false;
    const year = parseInt(match[1], 10);
    return year >= 1900 && year <= 2100;
  };

  const isStartTimeYearInvalid = !isValidYear(startTime);
  const isEndTimeYearInvalid = !isValidYear(endTime);

  const proofState = useMemo(() => {
    const site = (currentShift as any).site || {};
    const cs = currentShift as any;

    const needsOdoStart =
      cs.requires_odo_start != null
        ? cs.requires_odo_start === true
        : site.odometer_required === true;
    const needsOdoEnd =
      cs.requires_odo_end != null
        ? cs.requires_odo_end === true
        : site.odometer_required === true;
    const needsInvoice =
      cs.requires_invoice != null
        ? cs.requires_invoice === true
        : (site.invoice_required === true || tenantSettings?.invoice_required === true);

    const hasStartPhoto = !!cs.photo_start_url;
    const hasEndPhoto = !!cs.photo_end_url;
    const hasInvoicePhoto = !!cs.photo_invoice_url;

    const items = [
      {
        key: 'odo_start',
        label: 'Стартовый одометр',
        required: needsOdoStart,
        uploaded: hasStartPhoto,
      },
      {
        key: 'odo_end',
        label: 'Финишный одометр',
        required: needsOdoEnd,
        uploaded: hasEndPhoto,
      },
      {
        key: 'invoice',
        label: 'Накладная',
        required: needsInvoice,
        uploaded: hasInvoicePhoto,
      },
    ];

    const missingRequiredItems = items.filter((item) => item.required && !item.uploaded);
    const hasAnyVisibleZones = items.some((item) => item.required || item.uploaded);

    return {
      needsOdoStart,
      needsOdoEnd,
      needsInvoice,
      hasStartPhoto,
      hasEndPhoto,
      hasInvoicePhoto,
      hasAnyVisibleZones,
      items,
      missingRequiredItems,
      missingRequiredLabels: missingRequiredItems.map((item) => item.label),
    };
  }, [currentShift, tenantSettings]);

  // v1.1.2: Determine if changes are comment-only
  const originalStart = shift.start_time ? fromTenantISO(shift.start_time, effectiveTimezone) : "";
  const originalEnd = shift.end_time ? fromTenantISO(shift.end_time, effectiveTimezone) : "";
  const timeChanged = startTime !== originalStart || endTime !== originalEnd;
  const commentChanged = newComment.trim().length > 0;
  const isCommentOnly = commentChanged && !timeChanged;
  const needsBypassReasonForSubmit =
    isAdmin &&
    timeChanged &&
    shift.status !== 'finished' &&
    proofState.missingRequiredItems.length > 0;

  // v1.1.2: Smart save button validation
  const canSave = useMemo(() => {
    // Comment-only updates: always allowed (any status, any role)
    if (isCommentOnly) {
      return true;
    }

    // Time changes: require admin + active shift + valid times
    if (timeChanged) {
      if (!isAdmin) return false; // Only admin can change times
      if (!timezoneLoaded) return false;
      if (shift.status === 'finished') return false; // Can't change finished shift times
      if (isStartTimeYearInvalid || isEndTimeYearInvalid) return false;
      if (isEndTimeInvalid) return false;
      if (needsBypassReasonForSubmit && bypassReason.trim().length === 0) return false;
      return true;
    }

    // No changes: can't save
    return false;
  }, [isCommentOnly, timeChanged, isAdmin, timezoneLoaded, shift.status, isStartTimeYearInvalid, isEndTimeYearInvalid, isEndTimeInvalid, needsBypassReasonForSubmit, bypassReason]);

  const endTimeUtcPreview = useMemo(() => {
    if (!endTime || !timezoneLoaded || isEndTimeYearInvalid) {
      return null;
    }

    try {
      return toTenantISO(endTime, effectiveTimezone)
        .replace('T', ' ')
        .replace('.000Z', ' UTC');
    } catch {
      return null;
    }
  }, [endTime, effectiveTimezone, timezoneLoaded, isEndTimeYearInvalid]);

  // Format comment time for display
  const formatCommentTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Format audit timestamp for timeline
  const formatAuditTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return dateString;
    }
  };

  // Format comment header with Technical Header format
  const formatCommentHeader = (comment: Comment) => {
    // Format: [Name] • [Role Tag] • [DD.MM HH:mm]
    const date = new Date(comment.created_at);
    const dayMonth = date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    }); // "14.02"
    const time = date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }); // "12:30"

    // Role tag mapping (Russian labels per user decision)
    const roleLabels: Record<string, string> = {
      'admin': 'АДМИН',
      'driver': 'ВОДИТЕЛЬ',
      'foreman': 'ПРОРАБ'
    };
    const roleTag = comment.author_role
      ? roleLabels[comment.author_role] || comment.author_role.toUpperCase()
      : null;

    return {
      name: comment.author,
      roleTag,
      timestamp: `${dayMonth} ${time}`
    };
  };

  // Format @mentions in comment text
  const formatCommentText = (text: string) => {
    // Detect @mentions and wrap in styled spans
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return <span key={index} className="text-[#0a192f] font-semibold">{part}</span>;
      }
      return part;
    });
  };

  // Map action types to icons
  const getAuditIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('edit') || actionLower.includes('изменен') || actionLower.includes('обновлен')) {
      return Pencil;
    }
    if (actionLower.includes('delete') || actionLower.includes('remove') || actionLower.includes('удален')) {
      return Trash2;
    }
    if (actionLower.includes('статус') || actionLower.includes('status') || actionLower.includes('завершен') || actionLower.includes('запущен')) {
      return ArrowRightLeft;
    }
    if (actionLower.includes('фото') || actionLower.includes('photo') || actionLower.includes('image')) {
      return Image;
    }
    if (actionLower.includes('комментарий') || actionLower.includes('comment')) {
      return MessageSquare;
    }
    return FileText;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-50 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 id="modal-title" className="text-xl font-semibold text-[#1B254B]">
                Редактировать смену
              </h3>
              <p className="text-slate-400 text-xs font-medium mt-1 font-mono mono-id">
                ID: <span className="mono-number">#{shift.id}</span> • {shift.driver_name}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <form id="edit-shift-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error message */}
            {error && (
              <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-2 ${
                overlapError
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-red-50 text-red-600 border border-red-100"
              }`}>
                {overlapError ? (
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <span>⚠️</span>
                )}
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Check size={16} className="flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {activeTab === 'details' && isAdmin && proofState.missingRequiredItems.length > 0 && (
              <div className="px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">В смене отсутствуют обязательные подтверждения: {proofState.missingRequiredLabels.join(", ")}</p>
                    <p className="mt-1 text-amber-700">
                      Если вы закрываете смену без обязательных фото, укажите причину. Она будет отправлена в backend в поле комментария.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Proxy Photo Upload Section - Smart Filtering - Details Tab Only */}
            {activeTab === 'details' && (() => {
              const needsOdoStart = proofState.needsOdoStart;
              const needsOdoEnd = proofState.needsOdoEnd;
              const needsInvoice = proofState.needsInvoice;

              // Smart Hybrid visibility: show if Required OR if Data Exists
              const shouldShowZone = (isRequired: boolean, hasData: boolean) => {
                return isRequired || hasData;
              };

              const hasStartPhoto = proofState.hasStartPhoto;
              const hasEndPhoto = proofState.hasEndPhoto;
              const hasInvoicePhoto = proofState.hasInvoicePhoto;

              const showStartZone = shouldShowZone(needsOdoStart, hasStartPhoto);
              const showEndZone = shouldShowZone(needsOdoEnd, hasEndPhoto);
              const showInvoiceZone = shouldShowZone(needsInvoice, hasInvoicePhoto);

              const hasAnyVisibleZones = showStartZone || showEndZone || showInvoiceZone;

              // Loading skeleton for photo zones
              if (showSettingsSkeleton) {
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Upload size={16} className="text-slate-500" />
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Загрузка фото
                      </label>
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-slate-100 border border-slate-200 rounded-lg animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (!hasAnyVisibleZones) {
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Upload size={16} className="text-slate-500" />
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Загрузка фото
                      </label>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <p className="text-sm text-slate-500 font-medium">Фото не требуются по настройкам объекта</p>
                    </div>
                  </div>
                );
              }

              return (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Upload size={16} className="text-slate-500" />
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Загрузка фото (админ)
                    </label>
                  </div>

                  <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Сводка подтверждений
                    </p>
                    <div className="space-y-2">
                      {proofState.items.map((item) => {
                        const statusText = !item.required
                          ? 'не требуется'
                          : item.uploaded
                            ? 'загружено'
                            : 'отсутствует';
                        const statusClass = !item.required
                          ? 'text-slate-500'
                          : item.uploaded
                            ? 'text-emerald-700'
                            : 'text-amber-700';

                        return (
                          <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-700">{item.label}</span>
                            <span className={`font-medium ${statusClass}`}>
                              {item.required ? 'обязательно' : 'необязательно'} · {statusText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Start Odometer Photo */}
                    {showStartZone && (
                      <div className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🏁</span>
                            <span className="text-sm font-semibold text-slate-700">Одометр (старт)</span>
                            {needsOdoStart ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-100 text-emerald-700 border border-emerald-200 rounded">
                                [ОБЯЗАТЕЛЬНО]
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200 rounded">
                                [ОПЦИОНАЛЬНО]
                              </span>
                            )}
                          </div>
                          {(currentShift as any).photo_start_url ? (
                            <a
                              href={getPhotoUrl((currentShift as any).photo_start_url) || ''}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#0a192f] hover:text-[#152238] flex items-center gap-1"
                            >
                              <Image size={12} />
                              Просмотр
                            </a>
                          ) : null}
                        </div>
                        {!(currentShift as any).photo_start_url ? (
                          <label className="block border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingPhotoType === 'start'}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload('start', file);
                              }}
                            />
                            <Image size={24} className="text-slate-400 mx-auto mb-2" />
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">
                              Одометр (старт)
                            </span>
                            <span className="text-xs text-slate-400 block mt-1">
                              Перетащите или нажмите для загрузки
                            </span>
                          </label>
                        ) : (
                          <label className="block">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingPhotoType === 'start'}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload('start', file);
                              }}
                            />
                            <div className={`w-full py-2 px-4 rounded-lg text-center text-sm font-medium transition-colors cursor-pointer ${
                              uploadingPhotoType === 'start'
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-[#0a192f]/10 text-[#0a192f] hover:bg-[#0a192f]/20'
                            }`}>
                              {uploadingPhotoType === 'start' ? 'Загрузка...' : 'Загрузить фото'}
                            </div>
                          </label>
                        )}
                      </div>
                    )}

                    {/* End Odometer Photo */}
                    {showEndZone && (
                      <div className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🏁</span>
                            <span className="text-sm font-semibold text-slate-700">Одометр (финиш)</span>
                            {needsOdoEnd ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-100 text-emerald-700 border border-emerald-200 rounded">
                                [ОБЯЗАТЕЛЬНО]
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200 rounded">
                                [ОПЦИОНАЛЬНО]
                              </span>
                            )}
                          </div>
                          {(currentShift as any).photo_end_url ? (
                            <a
                              href={getPhotoUrl((currentShift as any).photo_end_url) || ''}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#0a192f] hover:text-[#152238] flex items-center gap-1"
                            >
                              <Image size={12} />
                              Просмотр
                            </a>
                          ) : null}
                        </div>
                        {!(currentShift as any).photo_end_url ? (
                          <label className="block border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingPhotoType === 'end'}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload('end', file);
                              }}
                            />
                            <Image size={24} className="text-slate-400 mx-auto mb-2" />
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">
                              Одометр (финиш)
                            </span>
                            <span className="text-xs text-slate-400 block mt-1">
                              Перетащите или нажмите для загрузки
                            </span>
                          </label>
                        ) : (
                          <label className="block">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingPhotoType === 'end'}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload('end', file);
                              }}
                            />
                            <div className={`w-full py-2 px-4 rounded-lg text-center text-sm font-medium transition-colors cursor-pointer ${
                              uploadingPhotoType === 'end'
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-[#0a192f]/10 text-[#0a192f] hover:bg-[#0a192f]/20'
                            }`}>
                              {uploadingPhotoType === 'end' ? 'Загрузка...' : 'Загрузить фото'}
                            </div>
                          </label>
                        )}
                      </div>
                    )}

                    {/* Invoice Photo */}
                    {showInvoiceZone && (
                      <div className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📄</span>
                            <span className="text-sm font-semibold text-slate-700">Накладная</span>
                            {needsInvoice ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-100 text-emerald-700 border border-emerald-200 rounded">
                                [ОБЯЗАТЕЛЬНО]
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200 rounded">
                                [ОПЦИОНАЛЬНО]
                              </span>
                            )}
                          </div>
                          {(currentShift as any).photo_invoice_url ? (
                            <a
                              href={getPhotoUrl((currentShift as any).photo_invoice_url) || ''}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#0a192f] hover:text-[#152238] flex items-center gap-1"
                            >
                              <Image size={12} />
                              Просмотр
                            </a>
                          ) : null}
                        </div>
                        {!(currentShift as any).photo_invoice_url ? (
                          <label className="block border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingPhotoType === 'invoice'}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload('invoice', file);
                              }}
                            />
                            <Image size={24} className="text-slate-400 mx-auto mb-2" />
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">
                              Накладная
                            </span>
                            <span className="text-xs text-slate-400 block mt-1">
                              Перетащите или нажмите для загрузки
                            </span>
                          </label>
                        ) : (
                          <label className="block">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingPhotoType === 'invoice'}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload('invoice', file);
                              }}
                            />
                            <div className={`w-full py-2 px-4 rounded-lg text-center text-sm font-medium transition-colors cursor-pointer ${
                              uploadingPhotoType === 'invoice'
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-[#0a192f]/10 text-[#0a192f] hover:bg-[#0a192f]/20'
                            }`}>
                              {uploadingPhotoType === 'invoice' ? 'Загрузка...' : 'Загрузить фото'}
                            </div>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Tab Navigation */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  activeTab === 'details'
                    ? 'bg-[#0a192f] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Редактирование
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  activeTab === 'history'
                    ? 'bg-[#0a192f] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                История
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  activeTab === 'comments'
                    ? 'bg-[#0a192f] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Комментарии
              </button>
            </div>

            {/* Time fields - only show in details tab */}
            {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* v1.1.2: Finished shifts warning */}
              {shift.status === 'finished' && (
                <div className="md:col-span-2 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <Lock size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Смена завершена</p>
                    <p className="text-amber-700 mt-1">
                      {isAdmin
                        ? "Только добавление комментария доступно. Изменение времени невозможно."
                        : "Вы можете добавить комментарий к этой смене."}
                    </p>
                  </div>
                </div>
              )}

              {currentShift.status === 'awaiting_odo_start' && (
                <div className="md:col-span-2 p-3 bg-sky-50 border border-sky-200 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="text-sky-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-sky-800">Смена ещё не начата</p>
                    <p className="text-sky-700 mt-1">
                      Ожидается фото стартового одометра. Время начала будет установлено после загрузки фото.
                    </p>
                  </div>
                </div>
              )}

              {isAdmin && proofState.missingRequiredItems.length > 0 && (
                <div className="md:col-span-2">
                  <label htmlFor="bypass-reason" className="block text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                    Причина закрытия без обязательных фото
                  </label>
                  <textarea
                    id="bypass-reason"
                    value={bypassReason}
                    onChange={(e) => setBypassReason(e.target.value)}
                    placeholder={`Укажите причину. Отсутствуют: ${proofState.missingRequiredLabels.join(", ")}`}
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg border border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-sm resize-none"
                  />
                  <p className="text-[10px] text-amber-700 mt-1">
                    Причина будет отправлена в backend в существующем поле комментария при закрытии смены.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="start-time" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Время начала *
                  {shift.status === 'finished' && !isAdmin && (
                    <span className="text-amber-600 font-normal ml-1">(только чтение)</span>
                  )}
                </label>
                <input
                  id="start-time"
                  name="start-time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  max={endTimeMax || "2100-12-31T23:59"}
                  step="60"
                  disabled={shift.status === 'finished' && !isAdmin}
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-sm ${
                    (shift.status === 'finished' && !isAdmin)
                      ? "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
                      : isStartTimeYearInvalid
                      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20"
                  }`}
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Время указывается по часовому поясу компании: {effectiveTimezone}
                </p>
                {browserTimezoneDiffers && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Ваше устройство: {browserTimezone}, компания: {effectiveTimezone}. Используйте время компании.
                  </p>
                )}
                {!timezoneLoaded && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Загрузка часового пояса компании...
                  </p>
                )}
                {isStartTimeYearInvalid && (
                  <p className="text-[10px] text-red-500 mt-1">
                    Некорректный год (1900-2100)
                  </p>
                )}
                {currentShift.status === 'awaiting_odo_start' && !startTime && (
                  <p className="text-[10px] text-sky-700 mt-1">
                    Поле пока может быть пустым: стартовое время появится после загрузки фото стартового одометра.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label htmlFor="end-time" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Время окончания
                    {shift.status === 'ACTIVE' && <span className="text-slate-400 font-normal ml-1">(опционально)</span>}
                    {shift.status === 'finished' && !isAdmin && (
                      <span className="text-amber-600 font-normal ml-1">(только чтение)</span>
                    )}
                  </label>
                  {isAdmin && shift.status !== 'finished' && (
                    <button
                      type="button"
                      onClick={() => setEndTime(nowInTenantTimezone(effectiveTimezone))}
                      disabled={!timezoneLoaded}
                      className="text-[10px] font-semibold text-[#0a192f] hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Сейчас
                    </button>
                  )}
                </div>
                <input
                  id="end-time"
                  name="end-time"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={endTimeMin}
                  max={endTimeMax || "2100-12-31T23:59"}
                  step="60"
                  disabled={shift.status === 'ACTIVE' || (shift.status === 'finished' && !isAdmin)}
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-sm ${
                    shift.status === 'ACTIVE' || (shift.status === 'finished' && !isAdmin)
                      ? "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
                      : isEndTimeInvalid || isEndTimeYearInvalid
                        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20"
                  }`}
                />
                {isEndTimeYearInvalid && shift.status !== 'ACTIVE' && !(shift.status === 'finished' && !isAdmin) ? (
                  <p className="text-[10px] text-red-500 mt-1">
                    Некорректный год (1900-2100)
                  </p>
                ) : isEndTimeBeforeStart && shift.status !== 'ACTIVE' && !(shift.status === 'finished' && !isAdmin) ? (
                  <p className="text-[10px] text-red-500 mt-1">
                    Должно быть позже начала
                  </p>
                ) : isEndTimeAfterTenantNow && shift.status !== 'ACTIVE' && !(shift.status === 'finished' && !isAdmin) ? (
                  <p className="text-[10px] text-red-500 mt-1">
                    Не может быть позже текущего времени компании ({effectiveTimezone})
                  </p>
                ) : shift.status === 'ACTIVE' ? (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Смена активна — время окончания нельзя изменить
                  </p>
                ) : shift.status === 'finished' && !isAdmin ? (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Завершенная смена — время нельзя изменить
                  </p>
                ) : endTimeUtcPreview ? (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Будет сохранено: {endTimeUtcPreview}
                  </p>
                ) : null}
              </div>
            </div>
            )}

            {/* Comments Section - only show in comments tab */}
            {activeTab === 'comments' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-slate-500" />
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Комментарии
                  {shift.status === 'finished' && (
                    <span className="text-amber-600 font-normal ml-2">(добавление комментариев разрешено)</span>
                  )}
                </label>
              </div>

              {/* Loading Skeleton */}
              {showCommentsSkeleton && (
                <div className="mb-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 bg-white rounded-lg border border-slate-100">
                        <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse mb-2"></div>
                        <div className="h-16 bg-slate-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments List (Chronological) */}
              {!loadingComments && !showCommentsSkeleton && comments.length > 0 && (
                <div className="mb-3 space-y-4 max-h-64 overflow-y-auto">
                  {comments.map((comment) => {
                    const header = formatCommentHeader(comment);
                    return (
                      <div key={comment.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        {/* Technical Header */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-700">{header.name}</span>
                          {header.roleTag && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded">
                                {header.roleTag}
                              </span>
                            </>
                          )}
                          <span className="text-slate-400">•</span>
                          <span className="text-xs text-slate-400 font-mono">{header.timestamp}</span>
                        </div>
                        {/* Comment Content (plain text, line breaks preserved) */}
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">
                          {formatCommentText(comment.text)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {!loadingComments && !showCommentsSkeleton && comments.length === 0 && !commentsError && (
                <div className="mb-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-400 text-center py-4">
                    Комментарии отсутствуют
                  </p>
                </div>
              )}

              {/* Error state */}
              {commentsError && (
                <div className="mb-3 p-4 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-sm text-red-600 text-center">
                    {commentsError}
                  </p>
                  <button
                    type="button"
                    onClick={loadComments}
                    className="mt-2 w-full px-4 py-2 text-sm font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    Повторить попытку
                  </button>
                </div>
              )}

              {/* Add New Comment */}
              <div>
                <label htmlFor="new-comment" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {shift.status === 'finished'
                    ? "Добавить комментарий к завершенной смене"
                    : "Добавить заметку"}
                </label>
                <textarea
                  id="new-comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={shift.status === 'finished'
                    ? "Укажите причину редактирования или добавьте примечание..."
                    : "Опишите изменения или причину редактирования..."}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20 outline-none transition-all text-sm resize-none"
                />
              </div>
            </div>
            )}


            {/* History Tab - only show in history tab */}
            {activeTab === 'history' && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} className="text-slate-500" />
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    История изменений
                  </label>
                </div>

                {/* Loading Skeleton */}
                {showAuditSkeleton && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
                          <div className="flex-1">
                            <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse mb-1"></div>
                            <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {!loadingAudit && !showAuditSkeleton && auditLogs.length > 0 && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 max-h-64 overflow-y-auto">
                    <div className="border-l-2 border-slate-200 pl-4 space-y-3">
                      {auditLogs.map((log, index) => {
                        const IconComponent = getAuditIcon(log.action || log.action_name || log.action_type);
                        return (
                          <div key={index} className="relative">
                            {/* Timeline dot */}
                            <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-slate-400"></div>

                            <div className="flex gap-3">
                              {/* Timestamp - left aligned */}
                              <div className="text-[10px] font-mono text-slate-400 shrink-0">
                                {formatAuditTime(log.created_at || log.timestamp)}
                              </div>

                              {/* Description - right aligned */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <IconComponent size={12} className="text-slate-400" />
                                  <span className="font-semibold text-slate-600">
                                    {log.user_name || log.user || 'Система'}
                                  </span>
                                  <span className="text-slate-500">
                                    {log.action || log.action_name || log.action_type}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!loadingAudit && !showAuditSkeleton && auditLogs.length === 0 && !auditError && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-400 text-center py-4">
                      История изменений пуста
                    </p>
                  </div>
                )}

                {/* Error state */}
                {auditError && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-sm text-red-600 text-center">
                      {auditError}
                    </p>
                    <button
                      type="button"
                      onClick={loadAuditLogs}
                      className="mt-2 w-full px-4 py-2 text-sm font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      Повторить попытку
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-50 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="relative flex-1 px-6 py-3 rounded-lg border border-slate-200 text-transparent font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-slate-600 after:content-['Закрыть']"
            >
              Отмена
            </button>
            <button
              type="submit"
              form="edit-shift-form"
              disabled={loading || !canSave}
              className="flex-1 px-6 py-3 rounded-lg bg-[#0a192f] text-white font-semibold text-sm hover:bg-[#152238] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Сохранение...</>
              ) : isCommentOnly ? (
                <>
                  <Send size={16} />
                  Добавить комментарий
                </>
              ) : (
                <>
                  <Send size={16} />
                  Сохранить изменения
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
);
};

export default EditShiftModal;
