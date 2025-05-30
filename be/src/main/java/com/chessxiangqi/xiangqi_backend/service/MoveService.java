package com.chessxiangqi.xiangqi_backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.model.Move;
import com.chessxiangqi.xiangqi_backend.repository.MoveRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MoveService {
    @Autowired
    private MoveRepository moveRepository;

    public List<Move> getAllMoves() {
        return moveRepository.findAll();
    }

    public Optional<Move> getMoveById(String id) {
        return moveRepository.findById(id);
    }

    public Move createMove(Move move) {
        return moveRepository.save(move);
    }

    public Move updateMove(String id, Move move) {
        move.setId(id);
        return moveRepository.save(move);
    }

    public void deleteMove(String id) {
        moveRepository.deleteById(id);
    }

    public Move saveMove(Move move) {
        log.info("Saving move for match: {}, turn: {}", move.getMatchId(), move.getTurnNumber());
        return moveRepository.save(move);
    }

    public List<Move> getMovesByMatchId(String matchId) {
        return moveRepository.findByMatchIdOrderByTurnNumberAsc(matchId);
    }

    public Move getLatestMove(String matchId) {
        return moveRepository.findTopByMatchIdOrderByTurnNumberDesc(matchId)
            .orElseThrow(() -> new RuntimeException("No moves found for match: " + matchId));
    }

    public int getNextTurnNumber(String matchId) {
        Move latestMove = moveRepository.findTopByMatchIdOrderByTurnNumberDesc(matchId)
            .orElse(null);
        return latestMove == null ? 0 : latestMove.getTurnNumber() + 1;
    }
} 