package com.chessxiangqi.xiangqi_backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chessxiangqi.xiangqi_backend.model.Move;
import com.chessxiangqi.xiangqi_backend.service.MoveService;
@RestController
@RequestMapping("/api/move")
@CrossOrigin(origins = "http://localhost:3000") // Cho phép FE gọi API
public class MoveController {
    @Autowired
    private MoveService moveService;

    // Lưu một nước đi mới
    @PostMapping
    public ResponseEntity<Move> saveMove(@RequestBody Move move) {
        Move saved = moveService.saveMove(move);
        return ResponseEntity.ok(saved);
    }

    // Lấy toàn bộ nước đi của một trận đấu
    @GetMapping("/match/{matchId}")
    public ResponseEntity<List<Move>> getMovesByMatch(@PathVariable String matchId) {
        List<Move> moves = moveService.getMovesByMatchId(matchId);
        return ResponseEntity.ok(moves);
    }
} 