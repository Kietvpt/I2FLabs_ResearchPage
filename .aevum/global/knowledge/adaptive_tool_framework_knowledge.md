---
title: "2-Tier Adaptive Tool Framework & Dynamic Tool Hydration Knowledge (v2.0 Polymorphic Clean Cut)"
category: "architecture"
author: "Vidus"
persona_aid: "ARC-VIDUS-AUHD2Y"
created_at: "2026-08-09T11:05:00.000Z"
updated_at: "2026-10-29T20:50:00.000Z"
tags: ["mcp", "tool_hydration", "2_tier_framework", "polymorphic_v2", "clean_cut"]
---

# 2-Tier Adaptive Tool Framework & Dynamic Tool Hydration (v2.0 Architecture)

## 📌 Tổng Quan Kiến Trúc
Hệ thống Aevum OS áp dụng mô hình quản lý công cụ **2-Tier Polymorphic Tool Framework v2.0**, giúp tối ưu hóa Prompt Tokens (~85% token reduction, ~20,000 tokens/turn saved) và tăng tốc độ xử lý nơ-ron nhận thức cho Agent thông qua cơ chế Thalamic Semantic Attention.

---

## 🎯 Cấu Trúc 2 Tầng Công Cụ (44 Công cụ Đa hình Chuẩn Clean Cut)

### Tầng 1: Core Universal Tools (12 Công cụ Gốc Toàn Cục)
Mọi Agent ban đầu khi kết nối mặc định sở hữu 12 công cụ dùng chung cốt lõi sau:
- `aevum_bridge_lifecycle` & `aevum_session_lifecycle` (Vòng đời kết nối, handshake, và nghiệm thu phiên)
- `aevum_persona_manage` & `aevum_semantic_vault` (Khởi tạo danh tính và nạp tri thức nén)
- `aevum_architecture_inspect`, `aevum_plan_lifecycle` (Quản trị cấu trúc O-DDD và vòng đời Plan)
- `aevum_squad_manage`, `aevum_squad_communicate`, `aevum_squad_handoff` (Cộng tác và bàn giao trong Biệt đội)
- `aevum_search_knowledge` & `aevum_memory_manage` (Tìm kiếm và quản lý bộ nhớ sống)

### Tầng 2: Specialized Role Bundles (Cấp phát động theo Persona & Intent)
Tùy thuộc vào vai trò chính (Sở trường) và Giai đoạn công việc, Thalamic Attention Engine nạp thêm các gói công cụ chuyên biệt:
- **`knowledge_reflex`**: `aevum_reflex_manage`, `aevum_graph_manage`, `aevum_memory_manage`, `aevum_search_knowledge`.
- **`architecture` (Vidus)**: `aevum_architecture_inspect`, `aevum_structure_design`, `aevum_plan_lifecycle`, `aevum_boundary_guard`, `aevum_switch_workspace`.
- **`development` (An)**: `aevum_session_lifecycle`, `aevum_boundary_guard`, `aevum_plan_lifecycle`, `aevum_execute_command`, `aevum_browser_card_manage`, `aevum_uac_manage`, `aevum_app_launch`.
- **`research` (Luna / Zenith)**: `aevum_research_mission`, `aevum_research_tree_manage`, `aevum_research_explore`, `aevum_coresearch_interact`, `aevum_coresearch_evolution`.
- **`ops`**: `aevum_mcp_contracts_manage`, `aevum_github_manage`, `aevum_blackboard_manage`, `aevum_notification_manage`, `aevum_pipernet_manage`, `aevum_runtime_telemetry`.

---

## 💡 Hướng Dẫn Yêu Cầu Nạp Tool Mới (Thalamic JIT Tool Gating)
Nếu Agent nhận thấy công việc cần các công cụ ngoài gói mặc định, Agent chỉ cần phát ra từ khóa ý định (Intent Keyword) hoặc chuyển ngữ cảnh Workspace, Neuromorphic Thalamic Gating Engine của Aevum OS sẽ tự động kích hoạt nơ-ron tương ứng và bơm thêm Gói Tool tương ứng vào Context Window trong lượt tiếp theo mà không gây nghẽn prompt.
