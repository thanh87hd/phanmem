# BÁO CÁO SNAPSHOT SCHEMA & SỐ LƯỢNG BẢN GHI (BASELINE)
**Thời điểm tạo:** 2026-09-22T03:52:07.263Z
**Database:** ktnb_v4 (PostgreSQL)
**Tổng số bảng:** 126

| STT | Tên Bảng | Số Bản Ghi (Rows) | Số Cột | Khóa Chính (PK) |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `ai_response_cache` | **0** | 7 | id |
| 2 | `analytics_results` | **0** | 6 | id |
| 3 | `annual_control_assessments` | **0** | 21 | id |
| 4 | `audit_cases` | **0** | 16 | id |
| 5 | `audit_charters` | **0** | 9 | id |
| 6 | `audit_engagements` | **0** | 68 | id |
| 7 | `audit_expenses` | **0** | 17 | id |
| 8 | `audit_finding_personnel` | **0** | 7 | id |
| 9 | `audit_findings` | **0** | 66 | id |
| 10 | `audit_logs` | **8** | 11 | id |
| 11 | `audit_logs_default` | **0** | 11 | id, createdAt |
| 12 | `audit_logs_partitioned` | **2** | 11 | id, createdAt |
| 13 | `audit_logs_y2026m01` | **0** | 11 | id, createdAt |
| 14 | `audit_logs_y2026m02` | **0** | 11 | id, createdAt |
| 15 | `audit_logs_y2026m03` | **0** | 11 | id, createdAt |
| 16 | `audit_logs_y2026m04` | **0** | 11 | id, createdAt |
| 17 | `audit_logs_y2026m05` | **0** | 11 | id, createdAt |
| 18 | `audit_logs_y2026m06` | **0** | 11 | id, createdAt |
| 19 | `audit_logs_y2026m07` | **0** | 11 | id, createdAt |
| 20 | `audit_logs_y2026m08` | **0** | 11 | id, createdAt |
| 21 | `audit_logs_y2026m09` | **2** | 11 | id, createdAt |
| 22 | `audit_logs_y2026m10` | **0** | 11 | id, createdAt |
| 23 | `audit_logs_y2026m11` | **0** | 11 | id, createdAt |
| 24 | `audit_logs_y2026m12` | **0** | 11 | id, createdAt |
| 25 | `audit_minutes` | **0** | 22 | id |
| 26 | `audit_plan_units` | **0** | 18 | id |
| 27 | `audit_plans` | **0** | 23 | id |
| 28 | `audit_processes` | **0** | 13 | id |
| 29 | `audit_ratings` | **0** | 31 | id |
| 30 | `audit_reports` | **0** | 56 | id |
| 31 | `audit_sample_batches` | **0** | 29 | id |
| 32 | `audit_samples` | **0** | 87 | id |
| 33 | `audit_schedules` | **0** | 16 | id |
| 34 | `audit_tasks` | **0** | 12 | id |
| 35 | `audit_templates` | **16** | 15 | id |
| 36 | `audit_universe` | **0** | 28 | id |
| 37 | `audit_workstreams` | **0** | 19 | id |
| 38 | `auditor_rotations` | **2** | 7 | id |
| 39 | `compliance_status` | **0** | 2 | id |
| 40 | `conflict_declarations` | **0** | 11 | id |
| 41 | `continuous_audit_rules` | **0** | 33 | id |
| 42 | `control_exceptions` | **0** | 23 | id |
| 43 | `custom_field_definitions` | **0** | 11 | id |
| 44 | `dashboard_configs` | **0** | 7 | id |
| 45 | `data_ingestion_batches` | **0** | 18 | id |
| 46 | `debt_migration_records` | **0** | 36 | id |
| 47 | `defect_code_change_logs` | **0** | 7 | id |
| 48 | `defect_codes` | **0** | 18 | id |
| 49 | `department_histories` | **0** | 14 | id |
| 50 | `departments` | **0** | 13 | id |
| 51 | `digital_signatures` | **0** | 7 | id |
| 52 | `document_chunks` | **0** | 8 | id |
| 53 | `documents` | **0** | 14 | id |
| 54 | `dynamic_workflows` | **0** | 10 | id |
| 55 | `engagement_change_requests` | **0** | 12 | id |
| 56 | `eqa_assessments` | **1** | 9 | id |
| 57 | `evidences` | **0** | 16 | id |
| 58 | `executive_sessions` | **0** | 15 | id |
| 59 | `external_assurance_coordinations` | **0** | 13 | id |
| 60 | `external_database_connections` | **0** | 11 | id |
| 61 | `fact_daily_metrics` | **0** | 46 | id |
| 62 | `finding_knowledge_base` | **2** | 13 | id |
| 63 | `framework_resource_data` | **0** | 6 | id |
| 64 | `framework_resource_metadata` | **0** | 9 | id |
| 65 | `general_tasks` | **0** | 16 | id |
| 66 | `ia_strategic_plans` | **0** | 19 | id |
| 67 | `iqa_assessments` | **1** | 21 | id |
| 68 | `kita_chat_logs` | **0** | 11 | id |
| 69 | `kpi_assessments` | **0** | 22 | id |
| 70 | `kpi_scores` | **0** | 20 | id |
| 71 | `kpi_targets` | **0** | 17 | id |
| 72 | `kri_alerts` | **0** | 27 | id |
| 73 | `kri_backtest_results` | **0** | 22 | id |
| 74 | `kri_rule_configs` | **0** | 13 | id |
| 75 | `master_data_change_requests` | **0** | 23 | id |
| 76 | `migrations` | **0** | 3 | id |
| 77 | `monitoring_alerts` | **0** | 12 | id |
| 78 | `notifications` | **0** | 11 | id |
| 79 | `password_change_requests` | **0** | 10 | id |
| 80 | `process_activities` | **0** | 16 | id |
| 81 | `process_loopholes` | **0** | 14 | id |
| 82 | `qaip_surveys` | **2** | 9 | id |
| 83 | `quality_assessments` | **0** | 12 | id |
| 84 | `quality_reviews` | **0** | 19 | id |
| 85 | `raci_assignments` | **0** | 12 | id |
| 86 | `rcsa_assessments` | **0** | 18 | id |
| 87 | `recommendations` | **0** | 60 | id |
| 88 | `regulatory_exams` | **0** | 8 | id |
| 89 | `regulatory_findings` | **0** | 10 | id |
| 90 | `regulatory_knowledge_base` | **9** | 17 | id |
| 91 | `report_definitions` | **0** | 11 | id |
| 92 | `report_distributions` | **0** | 14 | id |
| 93 | `resource_allocations` | **0** | 14 | id |
| 94 | `resource_demands` | **0** | 16 | id |
| 95 | `review_actions` | **0** | 8 | id |
| 96 | `risk_assessments` | **0** | 47 | id |
| 97 | `risk_control_matrix` | **0** | 19 | id |
| 98 | `risk_criteria` | **0** | 9 | id |
| 99 | `risk_profile_change_requests` | **0** | 19 | id |
| 100 | `risk_profile_histories` | **0** | 13 | id |
| 101 | `risk_profiles` | **0** | 20 | id |
| 102 | `risk_registers` | **0** | 37 | id |
| 103 | `risk_scenario_analyses` | **0** | 25 | id |
| 104 | `roles` | **15** | 6 | id |
| 105 | `scenario_registers` | **0** | 15 | id |
| 106 | `security_alerts` | **0** | 13 | id |
| 107 | `security_config` | **17** | 9 | id |
| 108 | `session_activities` | **172** | 9 | id |
| 109 | `sso_providers` | **0** | 17 | id |
| 110 | `staff_rosters` | **0** | 28 | id |
| 111 | `stage_gates` | **0** | 19 | id |
| 112 | `status_transitions` | **0** | 15 | id |
| 113 | `tasks` | **0** | 27 | id |
| 114 | `tests_of_control` | **0** | 53 | id |
| 115 | `thematic_themes` | **4** | 18 | id |
| 116 | `timesheets` | **0** | 16 | id |
| 117 | `training_records` | **0** | 21 | id |
| 118 | `transactions` | **0** | 11 | id |
| 119 | `user_competencies` | **0** | 8 | id |
| 120 | `users` | **1** | 34 | id |
| 121 | `workflow_change_logs` | **0** | 10 | id |
| 122 | `workflow_definitions` | **0** | 6 | id |
| 123 | `workflow_instances` | **0** | 28 | id |
| 124 | `workflow_steps` | **0** | 7 | id |
| 125 | `working_paper_templates` | **5** | 8 | id |
| 126 | `working_papers` | **0** | 30 | id |

---

## CHI TIẾT CÁC BẢNG TRỌNG TÂM PHASE 1

### Bảng `audit_charters` (Hiện có: 0 bản ghi)

| Tên Cột | Kiểu Dữ Liệu | Cho Phép Null | Giá Trị Mặc Định |
| :--- | :--- | :---: | :--- |
| `id` | `integer` | NO | nextval('audit_charters_id_seq'::regclass) |
| `version` | `character varying` | NO | - |
| `title` | `character varying` | NO | - |
| `content` | `text` | NO | - |
| `status` | `character varying` | NO | 'Draft'::character varying |
| `approvedBy` | `character varying` | YES | - |
| `approvedAt` | `timestamp without time zone` | YES | - |
| `createdAt` | `timestamp without time zone` | NO | now() |
| `updatedAt` | `timestamp without time zone` | NO | now() |

### Bảng `kri_alerts` (Hiện có: 0 bản ghi)

| Tên Cột | Kiểu Dữ Liệu | Cho Phép Null | Giá Trị Mặc Định |
| :--- | :--- | :---: | :--- |
| `id` | `integer` | NO | nextval('kri_alerts_id_seq'::regclass) |
| `kriCode` | `character varying` | NO | - |
| `kriName` | `character varying` | NO | - |
| `departmentName` | `character varying` | NO | - |
| `departmentCode` | `character varying` | YES | - |
| `currentValue` | `character varying` | NO | - |
| `thresholdValue` | `character varying` | NO | - |
| `unit` | `character varying` | YES | - |
| `category` | `character varying` | YES | - |
| `metrics` | `character varying` | YES | - |
| `dataSource` | `character varying` | YES | - |
| `threshold` | `character varying` | YES | - |
| `figure` | `character varying` | YES | - |
| `currentRating` | `character varying` | YES | - |
| `expectedRating` | `character varying` | YES | - |
| `commentary` | `character varying` | YES | - |
| `mitigation` | `character varying` | YES | - |
| `note` | `character varying` | YES | - |
| `severity` | `character varying` | NO | - |
| `status` | `character varying` | NO | 'Active'::character varying |
| `reportMonth` | `integer` | YES | - |
| `reportYear` | `integer` | YES | - |
| `auditUniverseId` | `integer` | YES | - |
| `sourceFileName` | `character varying` | YES | - |
| `uploadBatchId` | `character varying` | YES | - |
| `createdAt` | `timestamp without time zone` | NO | now() |
| `updatedAt` | `timestamp without time zone` | NO | now() |

