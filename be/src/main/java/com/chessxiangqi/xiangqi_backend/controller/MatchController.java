package com.chessxiangqi.xiangqi_backend.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chessxiangqi.xiangqi_backend.dto.ApiResponse;
import com.chessxiangqi.xiangqi_backend.service.GameSessionService;

@RestController
@RequestMapping("/api/matches")
@CrossOrigin(origins = "http://localhost:3000")
public class MatchController {

    @Autowired
    private GameSessionService gameSessionService;

    // Trạng thái đầy đủ của trận để client vẽ lại bàn cờ khi mở hoặc tải lại trang
    @GetMapping("/{matchId}/snapshot")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSnapshot(@PathVariable String matchId) {
        return gameSessionService.snapshot(matchId)
            .map(data -> ResponseEntity.ok(ApiResponse.success(data)))
            .orElseGet(() -> ResponseEntity.status(404)
                .body(ApiResponse.<Map<String, Object>>error("Không tìm thấy trận đấu")));
    }
}
