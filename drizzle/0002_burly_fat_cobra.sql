CREATE TABLE "curriculum_aliases" (
	"id" varchar(220) PRIMARY KEY NOT NULL,
	"curriculum_subject_id" uuid NOT NULL,
	"grade_number" smallint NOT NULL,
	"alias" text NOT NULL,
	"normalized_alias" varchar(160) NOT NULL,
	"mapping_type" varchar(48) NOT NULL,
	"confidence" varchar(32) NOT NULL,
	"notes" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_sources" (
	"id" varchar(180) PRIMARY KEY NOT NULL,
	"authority" varchar(80) NOT NULL,
	"title" text NOT NULL,
	"source_type" varchar(80) NOT NULL,
	"source_url" text NOT NULL,
	"academic_year" varchar(20) NOT NULL,
	"status" varchar(32) NOT NULL,
	"verification_status" varchar(32) NOT NULL,
	"notes" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_validation_issues" (
	"id" varchar(220) PRIMARY KEY NOT NULL,
	"severity" varchar(24) NOT NULL,
	"entity_type" varchar(48) NOT NULL,
	"entity_canonical_id" varchar(320) NOT NULL,
	"issue_type" varchar(80) NOT NULL,
	"description" text NOT NULL,
	"required_action" text NOT NULL,
	"source_id" varchar(180),
	"source_url" text NOT NULL,
	"status" varchar(32) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "curriculum_aliases" ADD CONSTRAINT "curriculum_aliases_curriculum_subject_id_curriculum_subjects_id_fk" FOREIGN KEY ("curriculum_subject_id") REFERENCES "public"."curriculum_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_alias_normalized_unique" ON "curriculum_aliases" USING btree ("grade_number","normalized_alias","curriculum_subject_id");