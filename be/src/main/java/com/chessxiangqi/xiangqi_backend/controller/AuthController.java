package com.chessxiangqi.xiangqi_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chessxiangqi.xiangqi_backend.dto.ApiResponse;
import com.chessxiangqi.xiangqi_backend.dto.LoginRequest;
import com.chessxiangqi.xiangqi_backend.dto.RegisterRequest;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000") // Cho phép FE gọi API
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Player>> register(@RequestBody RegisterRequest request) {
        try {

            if (authService.existsByUsername(request.getUsername())) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Tên đăng nhập đã tồn tại"));
            }

            Player player = authService.register(request);
            return ResponseEntity.ok(ApiResponse.success(player));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Đăng ký thất bại: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Player>> login(@RequestBody LoginRequest request) {
        try {
            Player player = authService.login(request);
            if (player == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Tên đăng nhập hoặc mật khẩu không đúng"));
            }
            return ResponseEntity.ok(ApiResponse.success(player));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Đăng nhập thất bại: " + e.getMessage()));
        }
    }
} 