-- Automatically generated, do not edit.
\unset ON_ERROR_STOP

DROP FUNCTION _median(anyarray);
DROP FUNCTION a_del_recording();
DROP FUNCTION a_del_release();
DROP FUNCTION a_del_release_event();
DROP FUNCTION a_del_release_group();
DROP FUNCTION a_del_track();
DROP FUNCTION a_ins_artist();
DROP FUNCTION a_ins_editor();
DROP FUNCTION a_ins_label();
DROP FUNCTION a_ins_recording();
DROP FUNCTION a_ins_release();
DROP FUNCTION a_ins_release_event();
DROP FUNCTION a_ins_release_group();
DROP FUNCTION a_ins_track();
DROP FUNCTION a_ins_work();
DROP FUNCTION a_upd_edit();
DROP FUNCTION a_upd_recording();
DROP FUNCTION a_upd_release();
DROP FUNCTION a_upd_release_event();
DROP FUNCTION a_upd_release_group();
DROP FUNCTION a_upd_track();
DROP FUNCTION b_ins_edit_materialize_status();
DROP FUNCTION b_upd_last_updated_table();
DROP FUNCTION b_upd_recording();
DROP FUNCTION controlled_for_whitespace(TEXT);
DROP FUNCTION create_bounding_cube(durations INTEGER[], fuzzy INTEGER);
DROP FUNCTION create_cube_from_durations(durations INTEGER[]);
DROP FUNCTION dec_ref_count(tbl varchar, row_id integer, val integer);
DROP FUNCTION del_collection_sub_on_delete();
DROP FUNCTION del_collection_sub_on_private();
DROP FUNCTION delete_orphaned_recordings();
DROP FUNCTION delete_ratings(enttype TEXT, ids INTEGER[]);
DROP FUNCTION delete_tags(enttype TEXT, ids INTEGER[]);
DROP FUNCTION delete_unused_tag(tag_id INT);
DROP FUNCTION delete_unused_url(ids INTEGER[]);
DROP FUNCTION deny_deprecated_links();
DROP FUNCTION deny_special_purpose_deletion();
DROP FUNCTION empty_artists();
DROP FUNCTION empty_labels();
DROP FUNCTION empty_places();
DROP FUNCTION empty_release_groups();
DROP FUNCTION empty_works();
DROP FUNCTION end_area_implies_ended();
DROP FUNCTION end_date_implies_ended();
DROP FUNCTION ensure_work_attribute_type_allows_text();
DROP FUNCTION from_hex(t text);
DROP FUNCTION generate_uuid_v3(namespace varchar, name varchar);
DROP FUNCTION generate_uuid_v4();
DROP FUNCTION inc_ref_count(tbl varchar, row_id integer, val integer);
DROP FUNCTION inserting_edits_requires_confirmed_email_address();
DROP FUNCTION materialise_recording_length(recording_id INT);
DROP FUNCTION padded_by_whitespace(TEXT);
DROP FUNCTION prevent_invalid_attributes();
DROP FUNCTION remove_unused_links();
DROP FUNCTION remove_unused_url();
DROP FUNCTION replace_old_sub_on_add();
DROP FUNCTION set_release_group_first_release_date(release_group_id INTEGER);
DROP FUNCTION simplify_search_hints();
DROP FUNCTION trg_delete_unused_tag();
DROP FUNCTION trg_delete_unused_tag_ref();
DROP FUNCTION unique_primary_area_alias();
DROP FUNCTION unique_primary_artist_alias();
DROP FUNCTION unique_primary_label_alias();
DROP FUNCTION unique_primary_place_alias();
DROP FUNCTION unique_primary_work_alias();
DROP FUNCTION whitespace_collapsed(TEXT);
DROP AGGREGATE array_accum (anyelement);
