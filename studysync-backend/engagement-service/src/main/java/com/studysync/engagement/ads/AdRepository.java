package com.studysync.engagement.ads;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AdRepository extends JpaRepository<Ad, UUID> {
    List<Ad> findByActiveTrue();
}
