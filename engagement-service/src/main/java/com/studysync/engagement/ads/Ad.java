package com.studysync.engagement.ads;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "ad", schema = "engagement")
public class Ad {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "ad_id")
    private UUID adId;

    @Column(nullable = false) private String title;
    @Column(nullable = false, length = 1000) private String body;
    @Column(nullable = false) private boolean active = true;

    public UUID getAdId() { return adId; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getBody() { return body; }
    public void setBody(String v) { this.body = v; }
    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active = v; }
}
