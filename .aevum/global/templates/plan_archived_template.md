---
plan_name: "${planFileName}"
domain: "${domainId}"
feature: "${featureId}"
version: "${version}"
status: "archived-dossier"

# Ai làm & Ai nghiệm thu
authors: ["${authors}"]
executed_by:
  agent: "${executedAgent}"
  role: "${executedRole}"
signoff_by:
  agent: "${signoffAgent}"
  role: "${signoffRole}"

# Làm khi nào & Thời gian thực thi
created_at: "${createdAt}"
started_at: "${startedAt}"
completed_at: "${completedAt}"
duration: "${duration}"

# Ranh giới bàn giao & Mã băm kiểm định
delivered_files:
  ${deliveredFiles}
git_commit: "${gitCommit}"
snapshot_id: "${snapshotId}"
verification_seal: "VERIFIED COMPLIANT (Zero Boundary Leaks)"
---

# ARCHIVED DOSSIER: ${planTitle}

### 1. Kết Quả Nghiệm Thu & Đóng Dấu Ký Số (Acceptance Verdict)
- **Người thực hiện (Developer):** @${executedAgent} (${executedRole})
- **Người nghiệm thu (Reviewer):** @${signoffAgent} (${signoffRole})
- **Thời gian hoàn tất:** ${completedAt} (Thời lượng: ${duration})
- **Đánh giá chất lượng:** PASS | 100% Clean Architecture | Zero Regressions.
- **Giá trị cốt lõi đã chuyển giao:**  
  ${executiveSummary}

### 2. Đặc Tả Kiến Trúc Đã Hiện Thực Hóa (Delivered Architecture)
- **Public APIs & Handshake đã mở:**
  ${publicApis}
- **Tệp cốt lõi đã bàn giao:**
  ${deliveredFilesList}
- **Quy chuẩn bảo vệ:** Đóng gói chặt chẽ, không để lộ logic nội bộ ra ngoài miền Bounded Context.

### 3. Tri Thức & Kỹ Năng Đúc Kết (Harvested Intelligence)
- **Mô thức phát hiện (Pattern):** ${pattern}
- **Bài học kinh nghiệm (Lesson):** ${lesson}
- **Kỹ năng đã chưng cất (Distilled Skill):** ${distilledSkill}

### 4. Bệ Phóng Cho Phiên Bản Kế Tiếp (Next-Gen Evolution Runway)
- **Giới hạn hiện tại (Current Limitations):**  
  ${currentLimitations}
- **Hạt giống Plan tiếp theo (Proposed Plan Seed - ${nextVersion}):**  
  **${nextPlanTitle}**: ${nextPlanDescription}

---
<details>
<summary>Xem lại Nhật ký Thực thi Chi tiết (Execution Audit Trail)</summary>

${auditTrailContent}

</details>

