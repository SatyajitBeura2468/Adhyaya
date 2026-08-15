ALTER TABLE "class_sections" ADD COLUMN "curriculum_class_id" uuid;--> statement-breakpoint
ALTER TABLE "curriculum_books" ADD COLUMN "canonical_key" varchar(240);--> statement-breakpoint
ALTER TABLE "curriculum_books" ADD COLUMN "source_label" text;--> statement-breakpoint
ALTER TABLE "curriculum_books" ADD COLUMN "source_type" varchar(40);--> statement-breakpoint
ALTER TABLE "curriculum_books" ADD COLUMN "checksum" varchar(128);--> statement-breakpoint
ALTER TABLE "curriculum_chapters" ADD COLUMN "canonical_key" varchar(260);--> statement-breakpoint
ALTER TABLE "curriculum_chapters" ADD COLUMN "provenance" text;--> statement-breakpoint
ALTER TABLE "curriculum_classes" ADD COLUMN "canonical_key" varchar(180);--> statement-breakpoint
ALTER TABLE "curriculum_classes" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "curriculum_classes" ADD COLUMN "provenance" text;--> statement-breakpoint
ALTER TABLE "curriculum_subjects" ADD COLUMN "canonical_key" varchar(220);--> statement-breakpoint
ALTER TABLE "curriculum_subjects" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "curriculum_subjects" ADD COLUMN "provenance" text;--> statement-breakpoint
ALTER TABLE "curriculum_subjects" ADD COLUMN "source_type" varchar(40);--> statement-breakpoint
ALTER TABLE "curriculum_topics" ADD COLUMN "canonical_key" varchar(280);--> statement-breakpoint
ALTER TABLE "curriculum_versions" ADD COLUMN "canonical_key" varchar(160);--> statement-breakpoint
ALTER TABLE "curriculum_versions" ADD COLUMN "source_type" varchar(40);--> statement-breakpoint
ALTER TABLE "curriculum_versions" ADD COLUMN "source_version" varchar(80);--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD COLUMN "curriculum_subject_id" uuid;--> statement-breakpoint
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_curriculum_class_id_curriculum_classes_id_fk" FOREIGN KEY ("curriculum_class_id") REFERENCES "public"."curriculum_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_curriculum_subject_id_curriculum_subjects_id_fk" FOREIGN KEY ("curriculum_subject_id") REFERENCES "public"."curriculum_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_book_key_unique" ON "curriculum_books" USING btree ("subject_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_chapter_key_unique" ON "curriculum_chapters" USING btree ("book_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_class_key_unique" ON "curriculum_classes" USING btree ("version_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_subject_key_unique" ON "curriculum_subjects" USING btree ("class_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_topic_key_unique" ON "curriculum_topics" USING btree ("chapter_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_assignment_curriculum_subject_unique" ON "teacher_assignments" USING btree ("teacher_id","class_section_id","curriculum_subject_id");