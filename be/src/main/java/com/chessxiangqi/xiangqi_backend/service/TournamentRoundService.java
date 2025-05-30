package com.chessxiangqi.xiangqi_backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.model.TournamentRound;
import com.chessxiangqi.xiangqi_backend.repository.TournamentRoundRepository;

@Service
public class TournamentRoundService {
    @Autowired
    private TournamentRoundRepository tournamentRoundRepository;

    public List<TournamentRound> getAllTournamentRounds() {
        return tournamentRoundRepository.findAll();
    }

    public Optional<TournamentRound> getTournamentRoundById(String id) {
        return tournamentRoundRepository.findById(id);
    }

    public TournamentRound createTournamentRound(TournamentRound round) {
        return tournamentRoundRepository.save(round);
    }

    public TournamentRound updateTournamentRound(String id, TournamentRound round) {
        round.setId(id);
        return tournamentRoundRepository.save(round);
    }

    public void deleteTournamentRound(String id) {
        tournamentRoundRepository.deleteById(id);
    }
} 