def test_seed_and_generate_timetable(db_client):
    # Seed database
    res = db_client.post("/api/seed")
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["message"] == "Database seeded successfully."

    # List timetables
    res = db_client.get("/api/timetables")
    assert res.status_code == 200

    # Generate timetable
    gen_res = db_client.post("/api/timetables/generate", json={"name": "Test Timetable"})
    assert gen_res.status_code == 201
    tt_data = gen_res.get_json()["data"]
    assert tt_data["name"] == "Test Timetable"
    assert tt_data["generation_status"] == "completed"
    assert tt_data["entries_count"] > 0
    assert len(tt_data["entries"]) > 0

    # Fetch specific timetable
    tt_id = tt_data["id"]
    get_res = db_client.get(f"/api/timetables/{tt_id}")
    assert get_res.status_code == 200
    assert get_res.get_json()["data"]["id"] == tt_id

    # Delete timetable
    del_res = db_client.delete(f"/api/timetables/{tt_id}")
    assert del_res.status_code == 204
